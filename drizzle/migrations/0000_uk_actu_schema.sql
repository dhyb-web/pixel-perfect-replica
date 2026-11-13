-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.article_badge AS ENUM ('normal', 'une', 'urgent');
CREATE TYPE public.article_status AS ENUM ('draft', 'published');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles names are public" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Articles
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_image_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  pdf_url text,
  pdf_name text,
  video_url text,
  author_id uuid,
  author_name text NOT NULL DEFAULT 'Rédaction UK ACTU',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  faculty text,
  badge public.article_badge NOT NULL DEFAULT 'normal',
  status public.article_status NOT NULL DEFAULT 'draft',
  views int NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX articles_status_published_idx ON public.articles (status, published_at DESC);
CREATE INDEX articles_category_idx ON public.articles (category_id);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published articles are public" ON public.articles FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admins read all articles" ON public.articles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert articles" ON public.articles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update articles" ON public.articles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete articles" ON public.articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER articles_touch_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_article_idx ON public.comments (article_id, created_at DESC);
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Signed-in users comment" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors or admins delete comments" ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Reactions (likes)
CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_id, type)
);
CREATE INDEX reactions_article_idx ON public.reactions (article_id);
GRANT SELECT ON public.reactions TO anon, authenticated;
GRANT INSERT, DELETE ON public.reactions TO authenticated;
GRANT ALL ON public.reactions TO service_role;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions are public" ON public.reactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Signed-in users react" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own reactions" ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- View counter
CREATE OR REPLACE FUNCTION public.increment_article_views(_article_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.articles SET views = views + 1 WHERE id = _article_id AND status = 'published';
$$;
GRANT EXECUTE ON FUNCTION public.increment_article_views(uuid) TO anon, authenticated;

-- New user: profile + role (first account becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    left(coalesce(NEW.raw_user_meta_data ->> 'first_name', ''), 80),
    left(coalesce(NEW.raw_user_meta_data ->> 'last_name', ''), 80)
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage policies (buckets: images, pdfs)
CREATE POLICY "UK media readable" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('images', 'pdfs'));
CREATE POLICY "Admins upload UK media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('images', 'pdfs') AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update UK media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('images', 'pdfs') AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete UK media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('images', 'pdfs') AND public.has_role(auth.uid(), 'admin'));

-- Seed categories
INSERT INTO public.categories (slug, name, position) VALUES
  ('communiques', 'Communiqués officiels', 1),
  ('inscriptions-concours', 'Inscriptions / Concours', 2),
  ('examens-resultats', 'Examens / Résultats', 3),
  ('vie-etudiante', 'Vie étudiante', 4),
  ('evenements', 'Événements', 5),
  ('sports', 'Sports', 6);

-- Seed demo articles
INSERT INTO public.articles (slug, title, excerpt, content, cover_image_url, gallery_urls, pdf_url, pdf_name, author_name, category_id, faculty, badge, status, views, published_at) VALUES
(
  'inscriptions-2026-2027-date-limite-30-novembre',
  'URGENT : les inscriptions 2026-2027 se clôturent le 30 novembre',
  'La Direction des Affaires Académiques et de la Scolarité rappelle que la date limite des inscriptions et réinscriptions est fixée au 30 novembre 2026. Aucune prolongation ne sera accordée.',
  E'La Direction des Affaires Académiques et de la Scolarité (DAAS) de l''Université de Kara informe l''ensemble des étudiants, nouveaux bacheliers comme anciens, que la période d''inscription et de réinscription pour l''année académique 2026-2027 prendra fin le lundi 30 novembre 2026 à 17 heures.\n\nLes dossiers doivent être déposés au guichet unique de la scolarité ou complétés en ligne. Chaque étudiant doit fournir une copie légalisée du diplôme du baccalauréat (nouveaux inscrits), le reçu de paiement des droits universitaires, deux photos d''identité récentes et la fiche de renseignements dûment remplie.\n\nPassé ce délai, aucune inscription ne sera acceptée et les étudiants non inscrits ne pourront pas composer aux examens du premier semestre. La DAAS invite chacun à ne pas attendre les derniers jours afin d''éviter l''affluence aux guichets.\n\nLe communiqué officiel complet, avec la liste des pièces à fournir par établissement, est disponible en téléchargement ci-dessous.',
  '/api/public/media/images/demo/inscriptions.jpg',
  '{}',
  '/api/public/media/pdfs/demo/communique-inscriptions-2026-2027.pdf',
  'Communiqué – Inscriptions 2026-2027.pdf',
  'Direction des Affaires Académiques',
  (SELECT id FROM public.categories WHERE slug = 'inscriptions-concours'),
  NULL,
  'urgent', 'published', 2847, '2026-11-12 08:30:00+00'
),
(
  'inauguration-campus-nord-universite-de-kara',
  'L''Université de Kara inaugure son nouveau Campus Nord',
  'Le 24 avril 2026, l''Université de Kara a officiellement inauguré son Campus Nord : amphithéâtres modernes, bibliothèque numérique et résidences pour plus de 5 000 étudiants.',
  E'C''est une journée historique pour l''Université de Kara. Le vendredi 24 avril 2026, le Campus Nord a été officiellement inauguré en présence des autorités gouvernementales, du Président de l''Université, des doyens de facultés et de centaines d''étudiants venus assister à la cérémonie.\n\nLe nouveau site s''étend sur plus de 40 hectares au pied des collines de Kara. Il comprend quatre amphithéâtres de 1 000 places, trente salles de travaux dirigés, une bibliothèque numérique ouverte jusqu''à 22 heures, des laboratoires de sciences et de santé, ainsi que des résidences universitaires pouvant accueillir plus de 5 000 étudiants.\n\n« Ce campus est un investissement dans l''avenir de notre jeunesse et de toute la région », a déclaré le Président de l''Université lors de son discours. Il a souligné que ces nouvelles infrastructures permettront de désengorger les salles du campus principal et d''améliorer considérablement les conditions d''études.\n\nLes premiers cours sur le Campus Nord débuteront dès la rentrée 2026-2027. Des navettes relieront le campus principal au Campus Nord à intervalles réguliers tout au long de la journée.',
  '/api/public/media/images/demo/campus-nord.jpg',
  ARRAY['/api/public/media/images/demo/campus-nord-2.jpg', '/api/public/media/images/demo/campus-nord-3.jpg', '/api/public/media/images/demo/campus-nord.jpg'],
  NULL, NULL,
  'Service Communication UK',
  (SELECT id FROM public.categories WHERE slug = 'evenements'),
  NULL,
  'une', 'published', 5213, '2026-11-10 10:00:00+00'
),
(
  'resultats-examens-second-semestre-2025-2026',
  'Résultats des examens du second semestre 2025-2026 disponibles',
  'Les résultats des examens du second semestre 2025-2026 de la FaSEG sont publiés. Les listes sont affichées et téléchargeables en PDF.',
  E'La Faculté des Sciences Économiques et de Gestion (FaSEG) informe ses étudiants que les résultats des examens du second semestre de l''année académique 2025-2026 sont désormais disponibles.\n\nLes listes sont affichées sur les panneaux de la faculté et peuvent également être téléchargées au format PDF ci-dessous. Les étudiants sont invités à vérifier attentivement leurs notes par unité d''enseignement.\n\nLes éventuelles réclamations doivent être déposées au secrétariat de la faculté dans un délai de sept (7) jours ouvrables à compter de la date de publication. Toute réclamation hors délai ne sera pas prise en compte.\n\nLa session de rattrapage se tiendra du 1er au 12 décembre 2026. Le calendrier détaillé sera communiqué dans les prochains jours.',
  '/api/public/media/images/demo/resultats.jpg',
  '{}',
  '/api/public/media/pdfs/demo/resultats-faseg-s2-2025-2026.pdf',
  'Résultats FaSEG – Semestre 2 2025-2026.pdf',
  'Secrétariat FaSEG',
  (SELECT id FROM public.categories WHERE slug = 'examens-resultats'),
  'FaSEG',
  'normal', 'published', 3982, '2026-11-08 14:15:00+00'
),
(
  'semaine-culturelle-etudiants-2026',
  'Semaine culturelle : le campus vibre aux rythmes du Togo',
  'Danses traditionnelles, concours de slam, expositions et dégustations : la semaine culturelle des étudiants a rassemblé des milliers de participants.',
  E'Du 2 au 7 novembre 2026, le campus de l''Université de Kara a accueilli la traditionnelle semaine culturelle organisée par les associations étudiantes.\n\nAu programme : danses traditionnelles des différentes régions du Togo, concours de slam et de poésie, tournoi d''éloquence, défilé de mode en tissu wax et soirée gastronomique. Les étudiants de la FLESH ont particulièrement marqué les esprits avec une pièce de théâtre sur l''histoire du Nord-Togo.\n\n« C''est l''occasion de se rencontrer au-delà des amphis et de célébrer la richesse de nos cultures », confie Akossiwa, étudiante en deuxième année de sociologie.\n\nLe bureau des associations remercie tous les participants et donne rendez-vous l''année prochaine pour une édition encore plus grande.',
  '/api/public/media/images/demo/vie-etudiante.jpg',
  '{}',
  NULL, NULL,
  'Rédaction UK ACTU',
  (SELECT id FROM public.categories WHERE slug = 'vie-etudiante'),
  'FLESH',
  'normal', 'published', 1564, '2026-11-07 17:40:00+00'
),
(
  'nouvelle-licence-arts-plastiques-2026-2027',
  'Nouveau : une Licence en Arts Plastiques ouvre à la rentrée 2026-2027',
  'L''Université de Kara lance une Licence professionnelle en Arts Plastiques. Peinture, sculpture, design et arts numériques au programme.',
  E'Bonne nouvelle pour les passionnés de création : l''Université de Kara ouvre, dès l''année académique 2026-2027, une Licence en Arts Plastiques rattachée à la Faculté des Lettres, Langues et Sciences Humaines (FLESH).\n\nCette formation de trois ans proposera des enseignements en peinture, sculpture, dessin, design graphique, photographie et arts numériques, complétés par des cours d''histoire de l''art africain et de gestion de projets culturels.\n\nLes étudiants disposeront d''ateliers entièrement équipés sur le Campus Nord et effectueront des stages auprès de galeries, de centres culturels et d''entreprises de communication.\n\nLa formation est ouverte aux titulaires du baccalauréat toutes séries. Les candidatures se font sur dossier avec présentation d''un portfolio de cinq à dix œuvres personnelles. La capacité d''accueil est limitée à 60 étudiants pour la première promotion.',
  '/api/public/media/images/demo/arts-plastiques.jpg',
  '{}',
  NULL, NULL,
  'Décanat FLESH',
  (SELECT id FROM public.categories WHERE slug = 'communiques'),
  'FLESH',
  'normal', 'published', 2210, '2026-11-05 09:00:00+00'
),
(
  'tournoi-inter-facultes-football-finale',
  'Tournoi inter-facultés : la FDSP remporte la finale face à la FSS',
  'Au terme d''une finale haletante (2-1), l''équipe de la FDSP s''offre le titre du tournoi inter-facultés de football devant plus de 3 000 supporters.',
  E'Le stade universitaire était plein à craquer ce samedi pour la finale du tournoi inter-facultés de football. Plus de 3 000 étudiants ont assisté à la victoire de la Faculté de Droit et de Science Politique (FDSP) face à la Faculté des Sciences de la Santé (FSS), sur le score de 2 buts à 1.\n\nMenée dès la 12e minute, la FDSP a su réagir avec une égalisation juste avant la pause, puis un but décisif à dix minutes de la fin, signé de son capitaine, élu meilleur joueur du tournoi.\n\nLe Service des Sports de l''Université a félicité les huit équipes engagées pour leur fair-play. La remise des trophées a eu lieu en présence du Vice-Président chargé de la vie étudiante.\n\nProchain rendez-vous sportif : le tournoi de basketball inter-facultés, prévu en janvier 2027. Les inscriptions des équipes sont ouvertes auprès du Service des Sports.',
  '/api/public/media/images/demo/sport.jpg',
  '{}',
  NULL, NULL,
  'Service des Sports',
  (SELECT id FROM public.categories WHERE slug = 'sports'),
  'FDSP',
  'normal', 'published', 1897, '2026-11-01 19:30:00+00'
);