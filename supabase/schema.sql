-- ============================================================
-- SQL SCHEMA CHO DÒNG TIỀN CÁ NHÂN (HỖ TRỢ ĐA NGƯỜI DÙNG - MULTI-USER)
-- ============================================================
-- Hướng dẫn:
-- 1. Đăng nhập https://supabase.com/dashboard/project/idbkualwmlaraashzlro
-- 2. Vào mục "SQL Editor" ở thanh menu bên trái.
-- 3. Tạo "New Query", dán toàn bộ nội dung script này vào và bấm "Run".
-- ============================================================

-- 1. BẢNG TRANSACTIONS (Giao dịch thu / chi gắn với user_id)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Bổ sung cột user_id nếu bảng đã tồn tại từ trước
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON public.transactions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON public.transactions(deleted_at);

-- 2. BẢNG CATEGORIES (Danh mục tùy chỉnh gắn với user_id)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON public.categories(updated_at DESC);

-- 3. BẢNG YEARLY_SUMMARIES (Lịch sử năm gắn với user_id)
CREATE TABLE IF NOT EXISTS public.yearly_summaries (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    year INT NOT NULL,
    total_income NUMERIC NOT NULL DEFAULT 0,
    total_expense NUMERIC NOT NULL DEFAULT 0,
    balance NUMERIC NOT NULL DEFAULT 0,
    transaction_count INT NOT NULL DEFAULT 0,
    top_expense_categories JSONB DEFAULT '[]'::jsonb,
    top_income_categories JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.yearly_summaries 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_yearly_summaries_user_id ON public.yearly_summaries(user_id);

-- 4. CẤP QUYỀN TRUY CẬP CHO AUTHENTICATED VÀ ANON
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.transactions TO anon, authenticated;
GRANT ALL ON TABLE public.categories TO anon, authenticated;
GRANT ALL ON TABLE public.yearly_summaries TO anon, authenticated;

-- 5. BẬT ROW LEVEL SECURITY (RLS) & PHÂN QUYỀN RIÊNG TƯ CHO TỪNG USER
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearly_summaries ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ nếu có
DROP POLICY IF EXISTS "Public full access transactions" ON public.transactions;
DROP POLICY IF EXISTS "User select own transactions" ON public.transactions;
DROP POLICY IF EXISTS "User insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "User update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "User delete own transactions" ON public.transactions;

-- Tạo chính sách bảo mật: User chỉ xem, thêm, sửa, xóa dữ liệu của CHÍNH MÌNH (auth.uid() = user_id)
CREATE POLICY "User select own transactions" ON public.transactions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "User insert own transactions" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User update own transactions" ON public.transactions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "User delete own transactions" ON public.transactions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Policies cho categories
DROP POLICY IF EXISTS "Public full access categories" ON public.categories;
DROP POLICY IF EXISTS "User select own categories" ON public.categories;
DROP POLICY IF EXISTS "User insert own categories" ON public.categories;
DROP POLICY IF EXISTS "User update own categories" ON public.categories;
DROP POLICY IF EXISTS "User delete own categories" ON public.categories;

CREATE POLICY "User select own categories" ON public.categories
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "User insert own categories" ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User update own categories" ON public.categories
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "User delete own categories" ON public.categories
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Policies cho yearly_summaries
DROP POLICY IF EXISTS "Public full access yearly_summaries" ON public.yearly_summaries;
DROP POLICY IF EXISTS "User select own yearly_summaries" ON public.yearly_summaries;
DROP POLICY IF EXISTS "User insert own yearly_summaries" ON public.yearly_summaries;
DROP POLICY IF EXISTS "User update own yearly_summaries" ON public.yearly_summaries;
DROP POLICY IF EXISTS "User delete own yearly_summaries" ON public.yearly_summaries;

CREATE POLICY "User select own yearly_summaries" ON public.yearly_summaries
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "User insert own yearly_summaries" ON public.yearly_summaries
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User update own yearly_summaries" ON public.yearly_summaries
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "User delete own yearly_summaries" ON public.yearly_summaries
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
