import React from 'react';
import './SkeletonLoader.css';

export const SkeletonProfile = () => {
    return (
        <div className="skeleton-container profile-skeleton fade-in">
            {/* Header Area */}
            <div className="sk-header">
                <div className="sk-avatar shimmer"></div>
                <div className="sk-title shimmer"></div>
                <div className="sk-subtitle shimmer"></div>
            </div>

            {/* Stats */}
            <div className="sk-stats">
                <div className="sk-stat-box shimmer"></div>
                <div className="sk-stat-box shimmer"></div>
                <div className="sk-stat-box shimmer"></div>
            </div>

            {/* Settings Links */}
            <div className="sk-section">
                <div className="sk-section-title shimmer"></div>
                <div className="sk-list">
                    <div className="sk-list-item shimmer"></div>
                    <div className="sk-list-item shimmer"></div>
                    <div className="sk-list-item shimmer"></div>
                </div>
            </div>

            <div className="sk-section">
                <div className="sk-section-title shimmer"></div>
                <div className="sk-list">
                    <div className="sk-list-item shimmer"></div>
                    <div className="sk-list-item shimmer"></div>
                </div>
            </div>
        </div>
    );
};

export const SkeletonWorkouts = () => {
    return (
        <div className="skeleton-container workouts-skeleton fade-in">
            <div className="sk-topbar">
                <div className="sk-title-large shimmer"></div>
                <div className="sk-button shimmer"></div>
            </div>

            <div className="sk-grid">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="sk-card shimmer">
                        <div className="sk-card-icon"></div>
                        <div className="sk-card-content">
                            <div className="sk-line w-70"></div>
                            <div className="sk-line w-40"></div>
                            <div className="sk-line w-90 mt-2"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
