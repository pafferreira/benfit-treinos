import { User, Settings, Bell, Shield, CircleHelp, LogOut, ChevronRight, Award, Activity } from 'lucide-react';
import './Profile.css';

const Profile = () => {
    return (
        <div className="profile-container">
            {/* Profile Header */}
            <div className="profile-header">
                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJT4i3SHiSRnhWT1Zip9JVLP_VPLghVxnwIznSdKURKN-1x3d-jNQu8jvDK6o6tpMqkBeSRI8Yxu-NCBeK689wVbcKphtk40Ss65S0GFoARgCa96yZm2QavXee2kVHjQlYPX8y2fVu5JVay_dnYK9yyi-ZrQvxHfFIDabFykKFINC6TND3deT2G0XHeRqwtTyRoOB0KhztI2F4OIZofGNh_sgXLylj4KP-KRm8PLzUb5-gmOx6TNHKEJAV-Vb03pXZn7PYCHtpovc"
                    alt="Profile"
                    className="profile-avatar-large"
                />
                <h2 className="profile-name">João Silva</h2>
                <p className="profile-email">joao.silva@email.com</p>

                <div className="profile-stats">
                    <div className="p-stat">
                        <span className="p-stat-value">12</span>
                        <span className="p-stat-label">Treinos</span>
                    </div>
                    <div className="p-stat">
                        <span className="p-stat-value">48</span>
                        <span className="p-stat-label">Horas</span>
                    </div>
                    <div className="p-stat">
                        <span className="p-stat-value">85kg</span>
                        <span className="p-stat-label">Peso</span>
                    </div>
                </div>
            </div>

            {/* Account Settings */}
            <div className="settings-section">
                <h3 className="settings-title">Conta</h3>
                <div className="settings-list">
                    <div className="settings-item">
                        <div className="item-left">
                            <User size={20} className="item-icon" />
                            <span>Dados Pessoais</span>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                    </div>
                    <div className="settings-item">
                        <div className="item-left">
                            <Award size={20} className="item-icon" />
                            <span>Minhas Metas</span>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                    </div>
                    <div className="settings-item">
                        <div className="item-left">
                            <Activity size={20} className="item-icon" />
                            <span>Histórico de Atividades</span>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                    </div>
                </div>
            </div>

            {/* App Settings */}
            <div className="settings-section">
                <h3 className="settings-title">Aplicativo</h3>
                <div className="settings-list">
                    <div className="settings-item">
                        <div className="item-left">
                            <Bell size={20} className="item-icon" />
                            <span>Notificações</span>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                    </div>
                    <div className="settings-item">
                        <div className="item-left">
                            <Shield size={20} className="item-icon" />
                            <span>Privacidade</span>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                    </div>
                    <div className="settings-item">
                        <div className="item-left">
                            <CircleHelp size={20} className="item-icon" />
                            <span>Ajuda e Suporte</span>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                    </div>
                </div>
            </div>

            <button className="logout-btn">
                <LogOut size={20} />
                Sair da Conta
            </button>
        </div>
    );
};

export default Profile;
