import React from 'react';

const CherpaCard = ({ icon, label, color, onClick }) => {
  return (
    <button className="cherpa-card" onClick={onClick}>
      <div className="cherpa-icon-box" style={{ borderColor: '#f1f5f9' }}>
        {React.cloneElement(icon, { stroke: color, strokeWidth: 3, fill: "none" })}
      </div>
      <span className="cherpa-card-label">{label}</span>
      <style>{`
        .cherpa-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: transform 0.1s;
          background: none;
          border: none;
          padding: 0;
          outline: none;
          -webkit-tap-highlight-color: transparent;
          width: 100%;
        }
        .cherpa-card:active {
          transform: scale(0.9);
        }
        .cherpa-icon-box {
          width: 100px;
          height: 100px;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 25px;
          border: 1.5px solid #f1f5f9;
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
        }
        .cherpa-icon-box svg {
          width: 50px;
          height: 50px;
        }
        .cherpa-card-label {
          font-size: 10px;
          font-weight: 950;
          color: #1e293b;
          text-transform: uppercase;
          text-align: center;
          white-space: nowrap;
        }
      `}</style>
    </button>
  );
};

export default CherpaCard;
