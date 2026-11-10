-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  client text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'violet',
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_user_idx ON public.projects(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects select" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own projects insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own projects update" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own projects delete" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Columns
CREATE TABLE public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'slate',
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX board_columns_project_idx ON public.board_columns(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_columns TO authenticated;
GRANT ALL ON public.board_columns TO service_role;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own columns select" ON public.board_columns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own columns insert" ON public.board_columns FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "own columns update" ON public.board_columns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "own columns delete" ON public.board_columns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref bigint GENERATED ALWAYS AS IDENTITY (START WITH 100),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  tags text[] NOT NULL DEFAULT '{}',
  due_date date,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_project_idx ON public.tasks(project_id);
CREATE INDEX tasks_column_idx ON public.tasks(column_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks select" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tasks insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.board_columns c WHERE c.id = column_id AND c.project_id = tasks.project_id AND c.user_id = auth.uid()));
CREATE POLICY "own tasks update" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.board_columns c WHERE c.id = column_id AND c.project_id = tasks.project_id AND c.user_id = auth.uid()));
CREATE POLICY "own tasks delete" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Subtasks
CREATE TABLE public.subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subtasks_task_idx ON public.subtasks(task_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtasks TO authenticated;
GRANT ALL ON public.subtasks TO service_role;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subtasks select" ON public.subtasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own subtasks insert" ON public.subtasks FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));
CREATE POLICY "own subtasks update" ON public.subtasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));
CREATE POLICY "own subtasks delete" ON public.subtasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX task_comments_task_idx ON public.task_comments(task_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own comments select" ON public.task_comments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own comments insert" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));
CREATE POLICY "own comments delete" ON public.task_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Chat threads
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_threads_user_idx ON public.chat_threads(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads select" ON public.chat_threads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own threads insert" ON public.chat_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own threads update" ON public.chat_threads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own threads delete" ON public.chat_threads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  message_id text NOT NULL,
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, message_id)
);
CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages select" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own messages insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE POLICY "own messages update" ON public.chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own messages delete" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER threads_touch BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Default columns for every new project
CREATE OR REPLACE FUNCTION public.create_default_columns() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.board_columns (project_id, user_id, name, color, position) VALUES
    (NEW.id, NEW.user_id, 'To-Do', 'slate', 1000),
    (NEW.id, NEW.user_id, 'In Progress', 'amber', 2000),
    (NEW.id, NEW.user_id, 'In Review', 'violet', 3000),
    (NEW.id, NEW.user_id, 'Done', 'emerald', 4000);
  RETURN NEW;
END; $$;
CREATE TRIGGER projects_default_columns AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.create_default_columns();

-- New user: profile + a starter project with sample tasks
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project uuid;
  c_todo uuid; c_prog uuid; c_review uuid; c_done uuid;
  t1 uuid; t2 uuid; t3 uuid;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(NEW.email, '@', 1)));

  INSERT INTO public.projects (user_id, name, client, description, color, position)
  VALUES (NEW.id, 'Welcome Board', 'Personal', 'Your first board — drag cards, open them, or ask the assistant.', 'violet', 1000)
  RETURNING id INTO v_project;

  SELECT id INTO c_todo FROM public.board_columns WHERE project_id = v_project AND name = 'To-Do';
  SELECT id INTO c_prog FROM public.board_columns WHERE project_id = v_project AND name = 'In Progress';
  SELECT id INTO c_review FROM public.board_columns WHERE project_id = v_project AND name = 'In Review';
  SELECT id INTO c_done FROM public.board_columns WHERE project_id = v_project AND name = 'Done';

  INSERT INTO public.tasks (project_id, column_id, user_id, title, description, priority, tags, due_date, position)
  VALUES (v_project, c_todo, NEW.id, 'Plan the week', 'Outline the key goals for the next 7 days', 'high', ARRAY['Planning'], current_date + 2, 1000)
  RETURNING id INTO t1;
  INSERT INTO public.tasks (project_id, column_id, user_id, title, description, priority, tags, due_date, position)
  VALUES (v_project, c_todo, NEW.id, 'Try the AI assistant', 'Ask it "What should I focus on today?"', 'low', ARRAY['Getting started'], NULL, 2000);
  INSERT INTO public.tasks (project_id, column_id, user_id, title, description, priority, tags, due_date, position)
  VALUES (v_project, c_prog, NEW.id, 'Design the landing page', 'Hero, features and pricing sections', 'medium', ARRAY['UI/UX Design','Front-End'], current_date + 5, 1000)
  RETURNING id INTO t2;
  INSERT INTO public.tasks (project_id, column_id, user_id, title, description, priority, tags, due_date, position)
  VALUES (v_project, c_review, NEW.id, 'Write onboarding copy', 'Short, friendly welcome messages', 'medium', ARRAY['Content'], current_date + 1, 1000)
  RETURNING id INTO t3;
  INSERT INTO public.tasks (project_id, column_id, user_id, title, description, priority, tags, due_date, position)
  VALUES (v_project, c_done, NEW.id, 'Create your account', 'You did it!', 'low', ARRAY['Getting started'], NULL, 1000);

  INSERT INTO public.subtasks (task_id, user_id, title, done, position) VALUES
    (t1, NEW.id, 'List top 3 priorities', false, 1000),
    (t1, NEW.id, 'Block focus time', false, 2000),
    (t2, NEW.id, 'Wireframe', true, 1000),
    (t2, NEW.id, 'Visual design', true, 2000),
    (t2, NEW.id, 'Responsive pass', false, 3000),
    (t3, NEW.id, 'First draft', true, 1000),
    (t3, NEW.id, 'Review tone', false, 2000);

  INSERT INTO public.task_comments (task_id, user_id, body) VALUES
    (t2, NEW.id, 'Wireframes look great — moving on to visuals.');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_columns() FROM PUBLIC, anon, authenticated;