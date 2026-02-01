import { Zap } from 'lucide-react';
import './MotivationalCard.css';

const MotivationalCard = ({
    message = "Let's crush it!",
    subtitle = "Today is upper body strength. Ready to beat your PR?",
    intensity = "High Intensity",
    userAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuCJT4i3SHiSRnhWT1Zip9JVLP_VPLghVxnwIznSdKURKN-1x3d-jNQu8jvDK6o6tpMqkBeSRI8Yxu-NCBeK689wVbcKphtk40Ss65S0GFoARgCa96yZm2QavXee2kVHjQlYPX8y2fVu5JVay_dnYK9yyi-ZrQvxHfFIDabFykKFINC6TND3deT2G0XHeRqwtTyRoOB0KhztI2F4OIZofGNh_sgXLylj4KP-KRm8PLzUb5-gmOx6TNHKEJAV-Vb03pXZn7PYCHtpovc"
}) => {
    return (
        <div className="motivational-card">
            <div className="motivational-content">
                <h2 className="motivational-title">{message}</h2>
                <p className="motivational-subtitle">{subtitle}</p>
                <div className="intensity-badge">
                    <Zap size={14} fill="currentColor" />
                    {intensity}
                </div>
            </div>
            <div className="motivational-image">
                <img src={userAvatar} alt="User" />
            </div>
        </div>
    );
};

export default MotivationalCard;
