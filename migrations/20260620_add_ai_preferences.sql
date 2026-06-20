ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ai_tone TEXT DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS ai_max_proposal_words INTEGER DEFAULT 250,
ADD COLUMN IF NOT EXISTS ai_include_pricing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_include_product_url BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_prioritize_relevance BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_keyword_penalty TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS ai_boost_repeat_posters BOOLEAN DEFAULT false;
