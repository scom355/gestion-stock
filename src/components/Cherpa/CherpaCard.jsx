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
          width: 75px;
          height: 75px;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          border: 2px solid #e2e8f0;
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
          overflow: hidden;
          padding: 8px;
          box-sizing: border-box;
        }
        @media (max-width: 360px) {
          .cherpa-icon-box {
            width: 65px;
            height: 65px;
            border-radius: 18px;
          }
          .cherpa-icon-box svg {
            width: 30px;
            height: 30px;
          }
        }
        .cherpa-icon-box svg {
          width: 36px;
          height: 36px;
        }
        .cherpa-card-label {
          font-size: 10px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          text-align: center;
          white-space: nowrap;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </button>
  );
};

export default CherpaCard;
