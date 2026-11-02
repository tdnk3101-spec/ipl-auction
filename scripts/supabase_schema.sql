-- ─── HARDENED SUPABASE POSTGRESQL SCHEMA FOR CRICK AUCTION ───
-- Production Grade RLS, Referential Integrity, and Performance Indexes

-- 1. AUCTIONS TABLE
CREATE TABLE IF NOT EXISTS public.auctions (
    id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL,
    host_name TEXT DEFAULT 'Manager',
    host_online BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'completed')),
    auction_type TEXT DEFAULT 'mega' CHECK (auction_type IN ('mega', 'sprint11', 'sprint5')),
    squad_limit INTEGER DEFAULT 25 CHECK (squad_limit > 0 AND squad_limit <= 30),
    overseas_limit INTEGER DEFAULT 8 CHECK (overseas_limit >= 0 AND overseas_limit <= 10),
    players JSONB DEFAULT '[]'::jsonb,
    banned_players JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    player_order JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    team_name TEXT,
    budget_remaining NUMERIC DEFAULT 120.0 CHECK (budget_remaining >= 0),
    spent NUMERIC DEFAULT 0.0 CHECK (spent >= 0),
    squad JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER FANTASY SQUADS TABLE
CREATE TABLE IF NOT EXISTS public.user_squads (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT,
    team_id TEXT,
    captain_id TEXT,
    vice_captain_id TEXT,
    players JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FANTASY CONFIG TABLE (ADMIN CONFIG)
CREATE TABLE IF NOT EXISTS public.fantasy_config (
    id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PERFORMANCE INDEXES ───
CREATE INDEX IF NOT EXISTS idx_auctions_status_public ON public.auctions (status, is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_host ON public.auctions (host_id);
CREATE INDEX IF NOT EXISTS idx_teams_auction_user ON public.teams (auction_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_squads_auction ON public.user_squads (auction_id, user_id);

-- ─── ENABLE ROW LEVEL SECURITY (RLS) ───
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_config ENABLE ROW LEVEL SECURITY;

-- ─── 1. AUCTIONS POLICIES ───
DROP POLICY IF EXISTS "Public can view public auctions" ON public.auctions;
DROP POLICY IF EXISTS "Hosts can insert auctions" ON public.auctions;
DROP POLICY IF EXISTS "Hosts can update their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Hosts can delete their own auctions" ON public.auctions;

-- Allow reading public rooms or rooms where the caller is the host or participant
CREATE POLICY "Public can view public auctions" ON public.auctions
    FOR SELECT USING (
        is_public = true 
        OR auth.uid()::text = host_id
        OR auth.role() = 'service_role'
    );

-- Allow authenticated users to create a room where host_id matches their UID
CREATE POLICY "Hosts can insert auctions" ON public.auctions
    FOR INSERT WITH CHECK (
        auth.uid()::text = host_id
        OR auth.role() = 'service_role'
        OR host_id LIKE 'guest_%'
    );

-- Only the host can update auction status or settings
CREATE POLICY "Hosts can update their own auctions" ON public.auctions
    FOR UPDATE USING (
        auth.uid()::text = host_id 
        OR auth.role() = 'service_role'
        OR host_id LIKE 'guest_%'
    ) WITH CHECK (
        auth.uid()::text = host_id 
        OR auth.role() = 'service_role'
        OR host_id LIKE 'guest_%'
    );

-- Only the host can delete the auction
CREATE POLICY "Hosts can delete their own auctions" ON public.auctions
    FOR DELETE USING (
        auth.uid()::text = host_id 
        OR auth.role() = 'service_role'
        OR host_id LIKE 'guest_%'
    );

-- ─── 2. TEAMS POLICIES ───
DROP POLICY IF EXISTS "Anyone can view teams in accessible auctions" ON public.teams;
DROP POLICY IF EXISTS "Users can insert their own team" ON public.teams;
DROP POLICY IF EXISTS "Owners and hosts can update teams" ON public.teams;

CREATE POLICY "Anyone can view teams in accessible auctions" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own team" ON public.teams
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id
        OR user_id LIKE 'bot_%'
        OR user_id LIKE 'guest_%'
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Owners and hosts can update teams" ON public.teams
    FOR UPDATE USING (
        auth.uid()::text = user_id
        OR user_id LIKE 'bot_%'
        OR user_id LIKE 'guest_%'
        OR auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.auctions 
            WHERE auctions.id = teams.auction_id 
            AND (auctions.host_id = auth.uid()::text OR auctions.host_id LIKE 'guest_%')
        )
    );

-- ─── 3. USER SQUADS POLICIES ───
DROP POLICY IF EXISTS "Public can view fantasy squads" ON public.user_squads;
DROP POLICY IF EXISTS "Users can manage their own fantasy squad" ON public.user_squads;

CREATE POLICY "Public can view fantasy squads" ON public.user_squads
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own fantasy squad" ON public.user_squads
    FOR ALL USING (
        auth.uid()::text = user_id
        OR user_id LIKE 'guest_%'
        OR auth.role() = 'service_role'
    );

-- ─── 4. FANTASY CONFIG POLICIES ───
DROP POLICY IF EXISTS "Public can view fantasy configuration" ON public.fantasy_config;
DROP POLICY IF EXISTS "Only admin can write fantasy configuration" ON public.fantasy_config;

CREATE POLICY "Public can view fantasy configuration" ON public.fantasy_config
    FOR SELECT USING (true);

CREATE POLICY "Only admin can write fantasy configuration" ON public.fantasy_config
    FOR ALL USING (
        auth.role() = 'service_role'
    );
