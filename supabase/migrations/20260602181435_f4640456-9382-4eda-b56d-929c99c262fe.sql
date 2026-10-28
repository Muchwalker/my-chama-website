
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('administrator','chairperson','treasurer','secretary','member');
CREATE TYPE public.member_status AS ENUM ('active','inactive');
CREATE TYPE public.loan_status AS ENUM ('pending','approved','rejected','active','repaid');
CREATE TYPE public.fine_status AS ENUM ('outstanding','paid','waived');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','excused');
CREATE TYPE public.meeting_status AS ENUM ('scheduled','completed','cancelled');

-- ============ PROFILES (members) ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  member_no TEXT UNIQUE,
  status public.member_status NOT NULL DEFAULT 'active',
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_roles()
RETURNS SETOF public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;

-- Helper: is staff (admin/chair/treasurer/secretary)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('administrator','chairperson','treasurer','secretary')
  )
$$;

-- ============ SETTINGS (singleton) ============
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  chama_name TEXT NOT NULL DEFAULT 'SmartChama',
  monthly_contribution NUMERIC(12,2) NOT NULL DEFAULT 1000,
  loan_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  auto_fine_missed_meeting BOOLEAN NOT NULL DEFAULT true,
  missed_meeting_fine NUMERIC(12,2) NOT NULL DEFAULT 200,
  late_contribution_fine NUMERIC(12,2) NOT NULL DEFAULT 150,
  currency TEXT NOT NULL DEFAULT 'KES',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.settings (id) VALUES (1);

-- ============ CONTRIBUTIONS ============
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  period_month DATE NOT NULL,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contrib_member ON public.contributions(member_id);
CREATE INDEX idx_contrib_period ON public.contributions(period_month);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- ============ FINE CATEGORIES ============
CREATE TABLE public.fine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_amount NUMERIC(12,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fine_categories TO authenticated;
GRANT ALL ON public.fine_categories TO service_role;
ALTER TABLE public.fine_categories ENABLE ROW LEVEL SECURITY;

INSERT INTO public.fine_categories (name, description, default_amount) VALUES
 ('Late contribution','Contribution paid after the due date',150),
 ('Missed meeting','Member missed a scheduled meeting',200),
 ('Rule violation','Violation of chama rules',500),
 ('Late arrival','Arriving late to a meeting',50);

-- ============ FINES ============
CREATE TABLE public.fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.fine_categories(id),
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT,
  status public.fine_status NOT NULL DEFAULT 'outstanding',
  issued_on DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_on DATE,
  issued_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fines_member ON public.fines(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fines TO authenticated;
GRANT ALL ON public.fines TO service_role;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

-- ============ LOANS ============
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  purpose TEXT,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  status public.loan_status NOT NULL DEFAULT 'pending',
  applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_on DATE,
  approved_by UUID REFERENCES auth.users(id),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loans_member ON public.loans(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- ============ LOAN REPAYMENTS ============
CREATE TABLE public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_repayments TO authenticated;
GRANT ALL ON public.loan_repayments TO service_role;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

-- ============ MEETINGS ============
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  agenda TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  status public.meeting_status NOT NULL DEFAULT 'scheduled',
  minutes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- ============ MEETING ATTENDANCE ============
CREATE TABLE public.meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'absent',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_attendance TO authenticated;
GRANT ALL ON public.meeting_attendance TO service_role;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- profiles: all authenticated can view (member directory); staff can write; users can update own profile
CREATE POLICY "auth can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- user_roles: users can view their own; admins manage all
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins view all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

-- settings: all view; admins update
CREATE POLICY "auth view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update settings" ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

-- contributions: all view; treasurer/admin write
CREATE POLICY "auth view contributions" ON public.contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "treasurer manage contributions" ON public.contributions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'treasurer') OR public.has_role(auth.uid(),'administrator'))
  WITH CHECK (public.has_role(auth.uid(),'treasurer') OR public.has_role(auth.uid(),'administrator'));

-- fine_categories: all view; admin/treasurer manage
CREATE POLICY "auth view fine cats" ON public.fine_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage fine cats" ON public.fine_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'treasurer'))
  WITH CHECK (public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'treasurer'));

-- fines: all view; treasurer/admin/secretary manage
CREATE POLICY "auth view fines" ON public.fines FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage fines" ON public.fines FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- loans: all view; member create own application; chair/admin approve; treasurer manage repayments
CREATE POLICY "auth view loans" ON public.loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "members apply loan" ON public.loans FOR INSERT TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_staff(auth.uid())
  );
CREATE POLICY "staff manage loans" ON public.loans FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "admin delete loans" ON public.loans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));

-- loan_repayments: all view; treasurer/admin manage
CREATE POLICY "auth view repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (true);
CREATE POLICY "treasurer manage repayments" ON public.loan_repayments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'treasurer') OR public.has_role(auth.uid(),'administrator'))
  WITH CHECK (public.has_role(auth.uid(),'treasurer') OR public.has_role(auth.uid(),'administrator'));

-- meetings: all view; secretary/admin/chair manage
CREATE POLICY "auth view meetings" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage meetings" ON public.meetings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'chairperson'))
  WITH CHECK (public.has_role(auth.uid(),'secretary') OR public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'chairperson'));

-- attendance: all view; staff manage
CREATE POLICY "auth view attendance" ON public.meeting_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage attendance" ON public.meeting_attendance FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- notifications: user views own; staff create
CREATE POLICY "view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- audit_logs: admins view; system inserts (authenticated allowed to insert their own actions)
CREATE POLICY "admins view audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrator'));
CREATE POLICY "auth insert audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============ TRIGGERS ============
-- Auto-create profile and assign 'member' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member_no TEXT;
BEGIN
  v_member_no := 'M' || LPAD((FLOOR(RANDOM()*9000)+1000)::TEXT, 4, '0');
  INSERT INTO public.profiles (user_id, full_name, email, member_no)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    v_member_no
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  -- First user becomes administrator
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrator')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER tg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_settings_updated BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
