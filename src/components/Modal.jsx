import { X } from "lucide-react";

export default function Modal({ title, subtitle, children, onClose, wide=false }) {
  return (
    <div className="overlay" onMouseDown={(e)=>e.target===e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <div className="modal-head">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-btn" onClick={onClose}><X size={19}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}
