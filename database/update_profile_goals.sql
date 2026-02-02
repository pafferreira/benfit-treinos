-- Add columns to B_Users for profile details
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'));
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS height_cm INTEGER;

-- Create B_User_Goals table
CREATE TABLE IF NOT EXISTS B_User_Goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES B_Users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add updated_at trigger for Goals
CREATE TRIGGER update_b_user_goals_updated_at BEFORE UPDATE ON B_User_Goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE B_User_Goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own goals" ON B_User_Goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own goals" ON B_User_Goals
    FOR ALL USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE B_User_Goals IS 'User fitness and personal goals';
