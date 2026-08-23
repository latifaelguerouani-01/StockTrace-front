import { CheckCircle2, AlertCircle, X } from "lucide-react";

export default function Toast({ toast, close }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type || "success"}`}>
      {toast.type === "error" ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
      <span>{toast.message}</span>
      <button onClick={close}><X size={15}/></button>
    </div>
  );
}
