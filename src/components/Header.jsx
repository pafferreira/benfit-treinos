import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Header.css';

const Header = () => {
  const [profile, setProfile] = useState(null);
  const location = useLocation();

  const fetchProfile = async (user) => {
    if (!user) {
      setProfile(null);
      return;
    }

    // 1. Define imediatamente com dados do Auth para evitar "vazio"
    setProfile(prev => ({
      ...prev,
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url || prev?.avatar_url
    }));

    // 2. Busca dados atualizados no banco (como o avatar customizado)
    const { data } = await supabase
      .from('b_users')
      .select('email, avatar_url, gender')
      .eq('id', user.id)
      .single();

    if (data) setProfile(data);
  };

  useEffect(() => {
    let channel;

    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fetchProfile(user);

        // 3. Subscrição em tempo real para mudanças no perfil (Avatar/Email)
        channel = supabase
          .channel(`public:b_users:id=eq.${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'b_users',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              setProfile(payload.new);
            }
          )
          .subscribe();
      }
    };

    initAuth();

    // Escuta mudanças na autenticação
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null);
    });

    return () => {
      authListener.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [location.pathname]); // Refresh automático ao mudar de tela

  return (
    <header className="benfit-header">
      <div className="header-container">
        <div className="header-logo">
          <span className="logo-text">BEN<span className="highlight">FIT</span></span>
        </div>

        <div className="header-profile">
          {profile && (
            <>
              <span className="user-identifier">{profile.email}</span>
              <div className="avatar-wrapper">
                <img
                  src={profile.avatar_url || (profile.gender === 'Feminino' ? '/avatar_skeleton_female.png' : '/avatar_skeleton.png')}
                  alt="User Avatar"
                  className="header-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/avatar_skeleton.png';
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;