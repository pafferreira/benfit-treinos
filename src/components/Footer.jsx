import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="benfit-footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} <span className="highlight">BENFIT</span> Treinos</p>
        <div className="footer-links">
          <span>Privacidade</span>
          <span>Termos</span>
          <span>Ajuda</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;