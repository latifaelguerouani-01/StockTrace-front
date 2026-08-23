import { useCallback, useEffect, useMemo, useState } from "react";
import {
 Activity, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Bell, Box,
ChevronRight, CircleUserRound, FolderOpen, Info, Languages, LayoutDashboard,
LogOut, Menu, Moon, Package, Pencil, Plus, RefreshCw, Search, ScanBarcode,
Settings, ShieldCheck, Sun, Trash2, TrendingDown, TrendingUp, UserRound, X} from "lucide-react";
import api from "./api";
import { tr } from "./i18n";
import BarcodeScanner from "./components/BarcodeScanner";
import Modal from "./components/Modal";
import Toast from "./components/Toast";

const nav = [
  ["dashboard", LayoutDashboard],
  ["products", Package],
  ["categories", FolderOpen],
  ["stockIn", ArrowDownToLine],
  ["stockOut", ArrowUpFromLine],
  ["alerts", Bell],
  ["settings", Settings],
  ["about", Info],
];

const productBlank = {
  reference:"", barcode:"", quantity:0, minStockAlert:5, categoryId:"",
  affectation:"", type:"", mark:"", remarks:"", tag:""
};

function readJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g,"+").replace(/_/g,"/")));
  } catch { return {}; }
}

function getRole() {
  const token = localStorage.getItem("stocktrace_token");

  const saved = JSON.parse(
    localStorage.getItem("stocktrace_user") || "{}"
  );

  return String(saved.role || "")
    .toUpperCase()
    .replace("ROLE_", "");
}

function displayName(p) {
  return p.name || p.reference || p.barcode || `#${p.id}`;
}

function normalizeProduct(p) {
  return {
    ...p,
    categoryId: p.categoryId ?? p.category?.id ?? "",
    categoryName: p.categoryName ?? p.category?.name ?? "—",
    minStockAlert: p.minStockAlert ?? p.minimumStock ?? 5,
  };
}

export default function App() {
  const [token, setToken] = useState(() => {
  const savedToken = localStorage.getItem("stocktrace_token");

  if (!savedToken) return null;

  try {
    const payload = readJwt(savedToken);

    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem("stocktrace_token");
      localStorage.removeItem("stocktrace_user");
      return null;
    }

    return savedToken;
  } catch {
    localStorage.removeItem("stocktrace_token");
    localStorage.removeItem("stocktrace_user");
    return null;
  }
});
  const [screen,setScreen] = useState("dashboard");
  const [lang,setLang] = useState(()=>localStorage.getItem("stocktrace_lang") || "fr");
  const [theme,setTheme] = useState(()=>localStorage.getItem("stocktrace_theme") || "light");
  const [mobile,setMobile] = useState(false);
  const [toast,setToast] = useState(null);
  const [logoutOpen,setLogoutOpen] = useState(false);
  const role = getRole();

  useEffect(()=>{
    localStorage.setItem("stocktrace_lang",lang);
    localStorage.setItem("stocktrace_theme",theme);
    document.documentElement.dataset.theme=theme;
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  },[lang,theme]);

  const notify=useCallback((message,type="success")=>{
    setToast({message,type});
    window.clearTimeout(window.__stockToast);
    window.__stockToast=window.setTimeout(()=>setToast(null),3200);
  },[]);

  const login = (data, email) => {
  localStorage.setItem("stocktrace_token", data.token);

  localStorage.setItem(
    "stocktrace_user",
    JSON.stringify({
      email: data.email || email,
      role: String(data.role || "").toUpperCase()
    })
  );

  setToken(data.token);
};

  const logout=()=>{
    localStorage.removeItem("stocktrace_token");
    localStorage.removeItem("stocktrace_user");
    setToken(null); setLogoutOpen(false);
  };

  if(!token) return <Login lang={lang} onLogin={login}/>;

  return (
    <div className="app-shell">
      <Sidebar lang={lang} screen={screen} setScreen={setScreen} mobile={mobile} close={()=>setMobile(false)} onLogout={()=>setLogoutOpen(true)} role={role}/>
      <div className="content-shell">
        <Header lang={lang} screen={screen} role={role} openMenu={()=>setMobile(true)} onAlerts={()=>setScreen("alerts")}/>
        <main className="content">
          {screen==="dashboard" && <Dashboard lang={lang} role={role} go={setScreen} notify={notify}/>}
          {screen==="products" && <Products lang={lang} role={role} notify={notify}/>}
          {screen==="categories" && <Categories lang={lang} notify={notify}/>}
          {screen==="stockIn" && <MovementPage type="IN" lang={lang} notify={notify}/>}
          {screen==="stockOut" && <MovementPage type="OUT" lang={lang} notify={notify}/>}
          {screen==="alerts" && <Alerts lang={lang} notify={notify}/>}
          {screen==="settings" && <SettingsPage lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} role={role} onLogout={()=>setLogoutOpen(true)}/>}
          {screen==="about" && <About lang={lang}/>}
        </main>
      </div>
      {logoutOpen && <Modal title={tr(lang,"logout")} onClose={()=>setLogoutOpen(false)}>
        <div className="confirm"><div className="confirm-icon"><LogOut/></div><p>{tr(lang,"confirmDelete")}</p>
          <div className="modal-actions"><button className="btn ghost" onClick={()=>setLogoutOpen(false)}>{tr(lang,"cancel")}</button><button className="btn danger" onClick={logout}>{tr(lang,"logout")}</button></div>
        </div>
      </Modal>}
      <Toast toast={toast} close={()=>setToast(null)}/>
    </div>
  );
}

function getRoleFromToken(token) {
  const p = readJwt(token);

  const raw =
    p.role ||
    p.roles?.[0] ||
    p.authority ||
    p.authorities?.[0] ||
    "";

  return String(raw)
    .toUpperCase()
    .replace("ROLE_", "");
}

function Login({lang,onLogin}){
  const [email,setEmail]=useState("admin@stocktrace.com");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const submit=async e=>{
    e.preventDefault();setLoading(true);setError("");
    try{
      const {data}=await api.post("/auth/login",{email:email.trim(),password});
      onLogin(data,email.trim());
    }catch(err){setError(err.response?.data?.message || err.response?.data || tr(lang,"invalidLogin"))}
    finally{setLoading(false)}
  };
  return <div className="login-page">
    <div className="login-brand-panel">
      <div className="brand-mark"><Box size={28}/></div>
      <div><strong>StockTrace</strong><span>Inventory intelligence</span></div>
      <div className="login-visual"><div className="visual-card"><TrendingUp/><strong>Real-time inventory</strong><span>Track products, movements and alerts.</span></div><div className="visual-card small"><ScanBarcode/><strong>Barcode ready</strong><span>Fast stock operations.</span></div></div>
    </div>
    <div className="login-form-panel">
      <div className="login-form-wrap">
        <span className="eyebrow">SECURE ACCESS</span>
        <h1>{tr(lang,"welcome")}</h1><p>{tr(lang,"manage")}</p>
        <form onSubmit={submit} className="form-stack">
          <Field label={tr(lang,"email")}><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field>
          <Field label={tr(lang,"password")}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></Field>
          {error && <div className="form-error">{error}</div>}
          <button className="btn primary login-submit" disabled={loading}>{loading?tr(lang,"loading"):tr(lang,"login")}<ChevronRight size={18}/></button>
        </form>
        <div className="login-foot">© {new Date().getFullYear()} StockTrace</div>
      </div>
    </div>
  </div>
}

function Sidebar({lang,screen,setScreen,mobile,close,onLogout,role}){
  return <>
    {mobile&&<div className="mobile-backdrop" onClick={close}/>}
    <aside className={`sidebar ${mobile?"mobile-open":""}`}>
      <div className="sidebar-brand"><div className="brand-mark small"><Box size={19}/></div><div><strong>StockTrace</strong><span>Inventory</span></div><button className="icon-btn mobile-close" onClick={close}><X/></button></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(([key,Icon])=><button key={key} className={screen===key?"active":""} onClick={()=>{setScreen(key);close()}}><Icon size={19}/><span>{tr(lang,key)}</span>{key==="alerts"&&<span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="role-card"><ShieldCheck size={18}/><div><strong>{role==="ADMIN"?tr(lang,"admin"):tr(lang,"manager")}</strong><span>{role}</span></div></div>
        <button className="logout-nav" onClick={onLogout}><LogOut size={18}/>{tr(lang,"logout")}</button>
      </div>
    </aside>
  </>
}

function Header({lang,screen,role,openMenu,onAlerts}){
  const current=nav.find(n=>n[0]===screen);
  return <header className="header">
    <div className="header-left"><button className="menu-mobile icon-btn" onClick={openMenu}><Menu/></button><div><span className="breadcrumb">StockTrace /</span><h2>{tr(lang,current?.[0]||"dashboard")}</h2></div></div>
    <div className="header-right"><button className="icon-btn notification" onClick={onAlerts}><Bell size={19}/><i/></button><div className="user-chip"><div className="avatar">{role==="ADMIN"?"A":"M"}</div><div><strong>{role==="ADMIN"?"Admin":"Magasinier"}</strong><span>{role}</span></div></div></div>
  </header>
}

function PageHead({title,subtitle,action}){
  return <div className="page-head"><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>
}

function Dashboard({lang,role,go,notify}){
  const [products,setProducts]=useState([]),[movements,setMovements]=useState([]),[alerts,setAlerts]=useState([]);
  const load=useCallback(async()=>{
    try{
      const [p,m,a]=await Promise.all([api.get("/products"),api.get("/stock"),api.get("/alerts/low-stock")]);
      setProducts((p.data||[]).map(normalizeProduct));setMovements(m.data||[]);setAlerts(a.data||[]);
    }catch(e){notify(e.response?.data?.message||"Could not load dashboard","error")}
  },[notify]);
  useEffect(()=>{load()},[load]);
  const units=products.reduce((s,p)=>s+Number(p.quantity||0),0);
  const inCount=movements.filter(m=>String(m.type).toUpperCase()==="IN").reduce((s,m)=>s+Number(m.quantity||0),0);
  const outCount=movements.filter(m=>String(m.type).toUpperCase()==="OUT").reduce((s,m)=>s+Number(m.quantity||0),0);
  const max=Math.max(units,1);
  return <>
    <PageHead title={`${tr(lang,"dashboard")}`} subtitle={`${role==="ADMIN"?"Admin":"Magasinier"} · ${new Date().toLocaleDateString(lang==="fr"?"fr-FR":lang==="ar"?"ar-MA":"en-US",{weekday:"long",day:"numeric",month:"long"})}`} action={<button className="btn ghost" onClick={load}><RefreshCw size={16}/> Refresh</button>}/>
    <div className="stats-grid">
      <Stat icon={Package} label={tr(lang,"totalProducts")} value={products.length} tone="blue" note={tr(lang,"overview")}/>
      <Stat icon={Box} label={tr(lang,"totalUnits")} value={units} tone="violet" note="Units in inventory"/>
      <Stat icon={TrendingUp} label={tr(lang,"stockIn")} value={inCount} tone="green" note="Recorded units"/>
      <Stat icon={AlertTriangle} label={tr(lang,"lowStock")} value={alerts.length} tone="orange" note={alerts.length?`${alerts.length} need attention`:"All healthy"}/>
    </div>
    <div className="dashboard-grid">
      <section className="panel chart-panel"><div className="panel-head"><div><span className="eyebrow">INVENTORY</span><h3>{tr(lang,"inventoryHealth")}</h3></div><span className="health-pill">{products.length-alerts.length}/{products.length||0} healthy</span></div>
        <div className="bars">
          {products.slice(0,8).map((p,i)=><div className="bar-col" key={p.id||i}><div className="bar-track"><div className={`bar-fill ${Number(p.quantity)<=Number(p.minStockAlert)?"warning":""}`} style={{height:`${Math.max(8,Math.min(100,Number(p.quantity)/max*100))}%`}}/></div><span>{String(displayName(p)).slice(0,8)}</span></div>)}
          {!products.length&&<div className="empty">{tr(lang,"createFirst")}</div>}
        </div>
      </section>
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">SHORTCUTS</span><h3>{tr(lang,"quick")}</h3></div></div>
        <div className="quick-actions"><Quick icon={Plus} title={tr(lang,"addProduct")} onClick={()=>go("products")}/><Quick icon={ArrowDownToLine} title={tr(lang,"stockIn")} onClick={()=>go("stockIn")}/><Quick icon={ArrowUpFromLine} title={tr(lang,"stockOut")} onClick={()=>go("stockOut")}/><Quick icon={FolderOpen} title={tr(lang,"addCategory")} onClick={()=>go("categories")}/></div>
      </section>
    </div>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">LATEST</span><h3>{tr(lang,"recent")}</h3></div><button className="text-btn" onClick={()=>go("products")}>{tr(lang,"openProducts")} <ChevronRight size={15}/></button></div>
      <div className="table-wrap"><table><thead><tr><th>{tr(lang,"product")}</th><th>{tr(lang,"category")}</th><th>{tr(lang,"quantity")}</th><th>{tr(lang,"status")}</th></tr></thead><tbody>
        {products.slice(0,6).map(p=><tr key={p.id}><td><div className="table-product"><div className="product-avatar"><Package size={16}/></div><div><strong>{displayName(p)}</strong><span>{p.barcode||p.reference||"—"}</span></div></div></td><td>{p.categoryName}</td><td><strong>{p.quantity}</strong></td><td><Status p={p} lang={lang}/></td></tr>)}
        {!products.length&&<tr><td colSpan="4"><div className="empty">{tr(lang,"noProducts")}</div></td></tr>}
      </tbody></table></div>
    </section>
  </>
}

function Stat({icon:Icon,label,value,tone,note}){
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-main"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>
}
function Quick({icon:Icon,title,onClick}){return <button className="quick-action" onClick={onClick}><span><Icon size={19}/></span><strong>{title}</strong><ChevronRight size={16}/></button>}
function Status({p,lang}){
  const q=Number(p.quantity||0),m=Number(p.minStockAlert||0);
  if(q===0)return <span className="status critical"><span/> {tr(lang,"outOfStock")}</span>;
  if(q<=m)return <span className="status warning"><span/> {tr(lang,"warning")}</span>;
  return <span className="status healthy"><span/> {tr(lang,"healthy")}</span>;
}

function Products({lang,role,notify}){
  const [items,setItems]=useState([]),[categories,setCategories]=useState([]),[search,setSearch]=useState("");
  const [modal,setModal]=useState(false),[scanner,setScanner]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(productBlank);
  const load=useCallback(async()=>{
    try{const [p,c]=await Promise.all([api.get("/products"),api.get("/categories")]);setItems((p.data||[]).map(normalizeProduct));setCategories(c.data||[])}
    catch(e){notify("Failed to load products","error")}
  },[notify]);
  useEffect(()=>{load()},[load]);
  const filtered=useMemo(()=>items.filter(p=>`${displayName(p)} ${p.reference||""} ${p.barcode||""} ${p.categoryName||""}`.toLowerCase().includes(search.toLowerCase())),[items,search]);
  const openAdd=(barcode="")=>{setEditing(null);setForm({...productBlank,barcode,categoryId:categories[0]?.id||""});setModal(true)};
  const openEdit=p=>{setEditing(p);setForm({...productBlank,...p,categoryId:p.categoryId||"",minStockAlert:p.minStockAlert??5});setModal(true)};
  const save=async e=>{
    e.preventDefault();
    const payload={reference:form.reference,barcode:form.barcode,quantity:Number(form.quantity||0),minStockAlert:Number(form.minStockAlert||0),affectation:form.affectation,type:form.type,mark:form.mark,remarks:form.remarks,tag:form.tag,category:form.categoryId?{id:Number(form.categoryId)}:null,name:form.reference,sku:form.barcode};
    try{if(editing)await api.put(`/products/${editing.id}`,payload);else await api.post("/products",payload);setModal(false);load();notify(tr(lang,"productSaved"))}
    catch(e){notify(e.response?.data?.message||e.response?.data||"Could not save product","error")}
  };
  const remove=async p=>{
    if(role!=="ADMIN"){notify(tr(lang,"deleteBlocked"),"error");return}
    if(!window.confirm(tr(lang,"confirmDelete")))return;
    try{await api.delete(`/products/${p.id}`);load();notify(tr(lang,"delete"))}catch(e){notify(e.response?.data?.message||"Could not delete","error")}
  };
  const scan=useCallback(code=>{setScanner(false);const found=items.find(p=>String(p.barcode)===String(code)||String(p.reference)===String(code));found?openEdit(found):openAdd(code)},[items,categories]);
  return <>
    <PageHead title={tr(lang,"products")} subtitle={`${items.length} ${tr(lang,"product").toLowerCase()}`} action={<button className="btn primary" onClick={()=>openAdd()}><Plus size={17}/>{tr(lang,"addProduct")}</button>}/>
    <div className="toolbar"><div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr(lang,"search")}/></div><button className="btn ghost" onClick={()=>setScanner(true)}><ScanBarcode size={17}/>{tr(lang,"scan")}</button></div>
    <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>{tr(lang,"product")}</th><th>{tr(lang,"reference")}</th><th>{tr(lang,"barcode")}</th><th>{tr(lang,"category")}</th><th>{tr(lang,"quantity")}</th><th>{tr(lang,"status")}</th><th>{tr(lang,"actions")}</th></tr></thead><tbody>
      {filtered.map(p=><tr key={p.id}>
  <td>
    <div className="table-product">
      <div className="product-avatar">
        <Package size={16}/>
      </div>
      <div>
        <strong>{displayName(p)}</strong>
        <span>{p.type||"Inventory item"}</span>
      </div>
    </div>
  </td>

  <td>{p.reference||"—"}</td>

  <td>
    <code>{p.barcode||"—"}</code>
  </td>

  <td>
    {translateCategory(p.categoryName, lang)}
  </td>

  <td>
    <strong>{p.quantity}</strong>
  </td>

  <td>
    <Status p={p} lang={lang}/>
  </td>

  <td>
    <div className="row-actions">
      <button
        className="icon-btn"
        onClick={()=>openEdit(p)}
        title={tr(lang,"edit")}
      >
        <Pencil size={16}/>
      </button>

      {role==="ADMIN" &&
        <button
          className="icon-btn danger-icon"
          onClick={()=>remove(p)}
          title={tr(lang,"delete")}
        >
          <Trash2 size={16}/>
        </button>
      }
    </div>
  </td>
</tr>)}
{!filtered.length&&<tr><td colSpan="7"><div className="empty">{tr(lang,"noProducts")}</div></td></tr>}
    </tbody></table></div></section>
    {modal&&<ProductModal lang={lang} form={form} setForm={setForm} categories={categories} editing={editing} onClose={()=>setModal(false)} onSave={save} onScan={()=>setScanner(true)}/>}
    {scanner&&<BarcodeScanner onClose={()=>setScanner(false)} onDetected={scan}/>}
  </>
}

function ProductModal({lang,form,setForm,categories,editing,onClose,onSave,onScan}){
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return <Modal title={editing?tr(lang,"edit"):tr(lang,"addProduct")} subtitle="Product information" onClose={onClose} wide>
    <form onSubmit={onSave} className="form-grid">
      <Field label={tr(lang,"reference")}><input value={form.reference||""} onChange={e=>set("reference",e.target.value)} placeholder="PMP-001" required/></Field>
      <Field label={tr(lang,"barcode")} extra={<button type="button" className="scan-mini" onClick={onScan}><ScanBarcode size={15}/></button>}><input value={form.barcode||""} onChange={e=>set("barcode",e.target.value)} placeholder="123456" /></Field>
      <Field label={tr(lang,"category")}><select value={form.categoryId||""} onChange={e=>set("categoryId",e.target.value)}><option value="">—</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label={tr(lang,"type")}><input value={form.type||""} onChange={e=>set("type",e.target.value)} placeholder="Pompe"/></Field>
      <Field label={tr(lang,"brand")}><input value={form.mark||""} onChange={e=>set("mark",e.target.value)} placeholder="Brand"/></Field>
      <Field label={tr(lang,"affectation")}><input value={form.affectation||""} onChange={e=>set("affectation",e.target.value)} placeholder="Station 01"/></Field>
      <Field label={tr(lang,"quantity")}><input type="number" min="0" value={form.quantity} onChange={e=>set("quantity",e.target.value)} /></Field>
      <Field label={tr(lang,"minimumStock")}><input type="number" min="0" value={form.minStockAlert} onChange={e=>set("minStockAlert",e.target.value)} /></Field>
      <Field label={tr(lang,"tag")}><input value={form.tag||""} onChange={e=>set("tag",e.target.value)} /></Field>
      <label className="field full"><div className="field-label"><span>{tr(lang,"remarks")}</span></div><textarea rows="4" value={form.remarks||""} onChange={e=>set("remarks",e.target.value)}/></label>
      <div className="modal-actions full"><button type="button" className="btn ghost" onClick={onClose}>{tr(lang,"cancel")}</button><button className="btn primary"><Plus size={17}/>{tr(lang,"save")}</button></div>
    </form>
  </Modal>
}

function Categories({lang,notify}){
  const [items,setItems]=useState([]),
        [search,setSearch]=useState(""),
        [modal,setModal]=useState(false),
        [editing,setEditing]=useState(null),
        [form,setForm]=useState({name:"",description:""});

  const load=useCallback(
    ()=>api.get("/categories")
      .then(r=>setItems(r.data||[]))
      .catch(()=>notify("Failed to load categories","error")),
    [notify]
  );

  useEffect(()=>{load()},[load]);

  const save=async e=>{
    e.preventDefault();

    try{
      if(editing)
        await api.put(`/categories/${editing.id}`,form);
      else
        await api.post("/categories",form);

      setModal(false);
      load();
      notify(tr(lang,"categorySaved"));
    }catch(e){
      notify(
        e.response?.data?.message ||
        "Could not save category",
        "error"
      );
    }
  };

  const remove=async id=>{
    if(!window.confirm(tr(lang,"confirmDelete")))return;

    try{
      await api.delete(`/categories/${id}`);
      load();
    }catch(e){
      notify("Category may contain products","error");
    }
  };

  const filtered=items.filter(c=>
    `${c.name} ${c.description||""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return <>
    <PageHead
      title={tr(lang,"categories")}
      subtitle={`${items.length} categories`}
      action={
        <button
          className="btn primary"
          onClick={()=>{
            setEditing(null);
            setForm({name:"",description:""});
            setModal(true);
          }}
        >
          <Plus size={17}/>
          {tr(lang,"addCategory")}
        </button>
      }
    />

    <div className="toolbar">
      <div className="search">
        <Search size={17}/>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={tr(lang,"search")}
        />
      </div>
    </div>

    <div className="category-grid">
      {filtered.map(c=>
        <div className="category-card" key={c.id}>

          <div className="category-top">

            <div className="category-icon">
              <FolderOpen/>
            </div>

            <div className="row-actions">

              <button
                className="icon-btn"
                onClick={()=>{
                  setEditing(c);
                  setForm({
                    name:c.name,
                    description:c.description||""
                  });
                  setModal(true);
                }}
              >
                <Pencil size={15}/>
              </button>

              <button
                className="icon-btn danger-icon"
                onClick={()=>remove(c.id)}
              >
                <Trash2 size={15}/>
              </button>

            </div>
          </div>

          {/* ✅ Traduction uniquement pour l'affichage */}
          <h3>{translateCategory(c.name, lang)}</h3>

          <p>{c.description||"—"}</p>

          <div className="category-footer">
            <span>
              {c.productsCount??"—"} products
            </span>
            <ChevronRight size={16}/>
          </div>

        </div>
      )}

      {!filtered.length &&
        <div className="panel empty">
          {tr(lang,"noCategories")}
        </div>
      }
    </div>

    {modal &&
      <Modal
        title={editing?tr(lang,"edit"):tr(lang,"addCategory")}
        onClose={()=>setModal(false)}
      >
        <form
          className="form-stack"
          onSubmit={save}
        >

          <Field label={tr(lang,"category")}>
            <input
              required
              value={form.name}
              onChange={e=>
                setForm({
                  ...form,
                  name:e.target.value
                })
              }
            />
          </Field>

          <Field label={tr(lang,"remarks")}>
            <textarea
              rows="4"
              value={form.description}
              onChange={e=>
                setForm({
                  ...form,
                  description:e.target.value
                })
              }
            />
          </Field>

          <div className="modal-actions">

            <button
              type="button"
              className="btn ghost"
              onClick={()=>setModal(false)}
            >
              {tr(lang,"cancel")}
            </button>

            <button className="btn primary">
              {tr(lang,"save")}
            </button>

          </div>

        </form>
      </Modal>
    }
  </>
}

function MovementPage({type,lang,notify}){
  const isIn=type==="IN";const [products,setProducts]=useState([]),[items,setItems]=useState([]),[modal,setModal]=useState(false),[scanner,setScanner]=useState(false);
  const [form,setForm]=useState({productId:"",quantity:1});
  const load=useCallback(async()=>{try{const [p,m]=await Promise.all([api.get("/products"),api.get("/stock")]);setProducts((p.data||[]).map(normalizeProduct));setItems(m.data||[])}catch(e){notify("Failed to load movements","error")}},[notify]);
  useEffect(()=>{load()},[load]);
  const submit=async e=>{e.preventDefault();try{await api.post(`/stock/${isIn?"in":"out"}?productId=${form.productId}&quantity=${Number(form.quantity)}`);setModal(false);load();notify(tr(lang,"stockRecorded"))}catch(e){notify(e.response?.data?.message||e.response?.data||"Could not record movement","error")}};
  const scan=code=>{setScanner(false);const p=products.find(x=>String(x.barcode)===String(code)||String(x.reference)===String(code));if(p)setForm({productId:p.id,quantity:1});else notify("Barcode not found","error")};
  const visible=items.filter(m=>String(m.type).toUpperCase()===type);
  return <>
    <PageHead title={isIn?tr(lang,"stockIn"):tr(lang,"stockOut")} subtitle={isIn?"Register received inventory":"Register issued inventory"} action={<button className="btn primary" onClick={()=>{setForm({productId:products[0]?.id||"",quantity:1});setModal(true)}}><Plus size={17}/>{isIn?tr(lang,"receive"):tr(lang,"issue")}</button>}/>
    <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>{tr(lang,"date")}</th><th>{tr(lang,"product")}</th><th>{tr(lang,"movement")}</th><th>{tr(lang,"quantity")}</th></tr></thead><tbody>
      {visible.map(m=><tr key={m.id}><td>{m.createdAt?new Date(m.createdAt).toLocaleString():"—"}</td><td><strong>{displayName(normalizeProduct(m.product||{}))}</strong></td><td><span className={`movement-pill ${isIn?"in":"out"}`}>{isIn?tr(lang,"incoming"):tr(lang,"outgoing")}</span></td><td><strong>{isIn?"+":"-"}{m.quantity}</strong></td></tr>)}{!visible.length&&<tr><td colSpan="4"><div className="empty">{tr(lang,"noMovements")}</div></td></tr>}
    </tbody></table></div></section>
    {modal&&<Modal title={isIn?tr(lang,"receive"):tr(lang,"issue")} subtitle={tr(lang,"movement")} onClose={()=>setModal(false)}>
      <form className="form-stack" onSubmit={submit}>
        <Field label={tr(lang,"product")} extra={<button type="button" className="scan-mini" onClick={()=>setScanner(true)}><ScanBarcode size={15}/></button>}><select required value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}><option value="">—</option>{products.map(p=><option key={p.id} value={p.id}>{displayName(p)} · {p.quantity}</option>)}</select></Field>
        <div className="current-stock"><span>{tr(lang,"currentStock")}</span><strong>{products.find(p=>Number(p.id)===Number(form.productId))?.quantity??0}</strong></div>
        <Field label={tr(lang,"quantity")}><input type="number" min="1" required value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field>
        <div className="modal-actions"><button type="button" className="btn ghost" onClick={()=>setModal(false)}>{tr(lang,"cancel")}</button><button className="btn primary">{tr(lang,"save")}</button></div>
      </form>
    </Modal>}
    {scanner&&<BarcodeScanner onClose={()=>setScanner(false)} onDetected={scan}/>}
  </>
}

function Alerts({lang,notify}){
  const [items,setItems]=useState([]);
  useEffect(()=>{api.get("/alerts/low-stock").then(r=>setItems(r.data||[])).catch(()=>notify("Failed to load alerts","error"))},[notify]);
  return <>
    <PageHead title={tr(lang,"alerts")} subtitle={tr(lang,"inventoryHealth")}/>
    <div className="alert-summary"><div><AlertTriangle/><strong>{items.length}</strong><span>{tr(lang,"lowStock")}</span></div><div><Activity/><strong>{items.filter(x=>Number(x.quantity||0)>0).length}</strong><span>{tr(lang,"warning")}</span></div><div><TrendingDown/><strong>{items.filter(x=>Number(x.quantity||0)===0).length}</strong><span>{tr(lang,"critical")}</span></div></div>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">ATTENTION</span><h3>{tr(lang,"alerts")}</h3></div></div><div className="alert-list">
      {items.map(p=><div className="alert-item" key={p.id}><div className={`alert-icon ${Number(p.quantity)===0?"critical":"warning"}`}><AlertTriangle size={18}/></div><div><strong>{displayName(p)}</strong><span>{Number(p.quantity)===0?tr(lang,"outOfStock"):`${tr(lang,"quantity")}: ${p.quantity} / ${p.minStockAlert}`}</span></div><ChevronRight size={17}/></div>)}
      {!items.length&&<div className="empty">{tr(lang,"alertsEmpty")}</div>}
    </div></section>
  </>
}

function SettingsPage({
  lang,
  setLang,
  theme,
  setTheme,
  role,
  onLogout,
  onCredentialsChanged
}) {
  const changeLang = e => setLang(e.target.value);
  const changeTheme = e => setTheme(e.target.value);

  const user = JSON.parse(
    localStorage.getItem("stocktrace_user") || "{}"
  );

  const [email, setEmail] = useState(user.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const saveCredentials = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const emailChanged =
      email.trim() !== (user.email || "").trim();

    const passwordChanged =
      newPassword.trim() !== "";

    if (!emailChanged && !passwordChanged) {
      setError(
        lang === "fr"
          ? "Aucune modification détectée."
          : "No changes were made."
      );
      return;
    }

    if (!currentPassword.trim()) {
      setError(
        lang === "fr"
          ? "Entrez votre mot de passe actuel."
          : "Enter your current password."
      );
      return;
    }

    if (passwordChanged && newPassword !== confirmPassword) {
      setError(
        lang === "fr"
          ? "Les mots de passe ne correspondent pas."
          : "Passwords do not match."
      );
      return;
    }

    if (passwordChanged && newPassword.length < 6) {
      setError(
        lang === "fr"
          ? "Le nouveau mot de passe doit contenir au moins 6 caractères."
          : "The new password must contain at least 6 characters."
      );
      return;
    }

    try {
      setSaving(true);

      await api.put("/users/me/credentials", {
        currentPassword: currentPassword,
        newEmail: email.trim(),
        newPassword: passwordChanged
          ? newPassword
          : null
      });

      setMessage(
        lang === "fr"
          ? "Identifiants modifiés avec succès."
          : "Credentials updated successfully."
      );

      setTimeout(() => {
        onCredentialsChanged();
      }, 1200);

    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data ||
        (
          lang === "fr"
            ? "Impossible de modifier les identifiants."
            : "Unable to update credentials."
        );

      setError(String(errorMessage));

    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead
        title={tr(lang, "settings")}
        subtitle={tr(lang, "profile")}
      />

      <div className="settings-grid">

        {/* PREFERENCES */}
        <section className="panel settings-card">

          <div className="panel-head">
            <div>
              <span className="eyebrow">
                PREFERENCES
              </span>

              <h3>
                {tr(lang, "general")}
              </h3>
            </div>
          </div>

          <Setting
            icon={Languages}
            label={tr(lang, "language")}
          >
            <select
              value={lang}
              onChange={changeLang}
            >
              <option value="fr">
                {tr(lang, "french")}
              </option>

              <option value="en">
                {tr(lang, "english")}
              </option>

              <option value="ar">
                {tr(lang, "arabic")}
              </option>
            </select>
          </Setting>

          <Setting
            icon={theme === "dark" ? Moon : Sun}
            label={tr(lang, "appearance")}
          >
            <select
              value={theme}
              onChange={changeTheme}
            >
              <option value="light">
                {tr(lang, "light")}
              </option>

              <option value="dark">
                {tr(lang, "dark")}
              </option>
            </select>
          </Setting>

        </section>


        {/* ACCOUNT */}
        <section className="panel settings-card">

          <div className="panel-head">
            <div>
              <span className="eyebrow">
                ACCOUNT
              </span>

              <h3>
                {tr(lang, "account")}
              </h3>
            </div>
          </div>


          {/* PROFILE */}
          <div className="profile-large">

            <div className="profile-avatar">
              {role === "ADMIN" ? "A" : "M"}
            </div>

            <div>
              <h3>
                {role === "ADMIN"
                  ? tr(lang, "admin")
                  : tr(lang, "manager")}
              </h3>

              <p>
                {user.email || "—"}
              </p>

              <span>
                {role}
              </span>
            </div>

          </div>


          {/* ROLE */}
          <Setting
            icon={CircleUserRound}
            label={tr(lang, "role")}
          >
            <input
              value={
                role === "ADMIN"
                  ? tr(lang, "admin")
                  : tr(lang, "manager")
              }
              readOnly
            />
          </Setting>


          {/* EMAIL / LOGIN */}
          <div className="setting-row">

            <div className="setting-label">
              <UserRound size={18} />

              <span>
                Email / Login
              </span>
            </div>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
            />

          </div>


          {/* CURRENT PASSWORD */}
          <div className="setting-row">

            <div className="setting-label">
              <ShieldCheck size={18} />

              <span>
                {lang === "fr"
                  ? "Mot de passe actuel"
                  : "Current password"}
              </span>
            </div>

            <input
              type="password"
              value={currentPassword}
              onChange={e =>
                setCurrentPassword(e.target.value)
              }
              placeholder="••••••••"
            />

          </div>


          {/* NEW PASSWORD */}
          <div className="setting-row">

            <div className="setting-label">
              <ShieldCheck size={18} />

              <span>
                {lang === "fr"
                  ? "Nouveau mot de passe"
                  : "New password"}
              </span>
            </div>

            <input
              type="password"
              value={newPassword}
              onChange={e =>
                setNewPassword(e.target.value)
              }
              placeholder="••••••••"
            />

          </div>


          {/* CONFIRM PASSWORD */}
          <div className="setting-row">

            <div className="setting-label">
              <ShieldCheck size={18} />

              <span>
                {lang === "fr"
                  ? "Confirmer le mot de passe"
                  : "Confirm password"}
              </span>
            </div>

            <input
              type="password"
              value={confirmPassword}
              onChange={e =>
                setConfirmPassword(e.target.value)
              }
              placeholder="••••••••"
            />

          </div>


          {/* ERROR */}
          {error && (
            <div className="settings-message error">
              {error}
            </div>
          )}


          {/* SUCCESS */}
          {message && (
            <div className="settings-message success">
              {message}
            </div>
          )}


          {/* SAVE */}
          <button
            className="btn primary"
            onClick={saveCredentials}
            disabled={saving}
          >
            {saving
              ? "..."
              : lang === "fr"
                ? "Enregistrer les modifications"
                : "Save changes"}
          </button>


          {/* LOGOUT */}
          <button
            className="logout-setting"
            onClick={onLogout}
          >
            <LogOut size={18} />
            {tr(lang, "logout")}
          </button>

        </section>

      </div>
    </>
  );
}
function About({ lang }) {
  const content = {
    fr: {
      title: "À propos de StockTrace",
      subtitle: "Gestion intelligente des stocks",
      description:
        "StockTrace est une application de gestion et de suivi des stocks conçue pour faciliter la gestion des produits, des entrées et sorties, ainsi que le suivi des mouvements de stock.",

      featuresTitle: "Fonctionnalités principales",
      features: [
        "Gestion des produits",
        "Gestion des entrées et sorties",
        "Suivi des mouvements de stock",
        "Recherche et filtrage",
        "Gestion des utilisateurs",
        "Lecture des codes-barres",
      ],

      creatorTitle: "Développé par",
      creatorName: "Latifa El Guerouani",
      education: "Développement Logiciel et Applicatif",
      school: "ENSA Agadir",

      internship: "Stage — ONEE Branche Eau",
      year: "2026",

      technologiesTitle: "Technologies",
      contactTitle: "Contact & profils",

      email: "Email",
      github: "GitHub",
      linkedin: "LinkedIn",

      version: "Version 1.0.0",
    },

    en: {
      title: "About StockTrace",
      subtitle: "Smart inventory management",
      description:
        "StockTrace is an inventory management and tracking application designed to simplify product management, stock entries and exits, and inventory movement tracking.",

      featuresTitle: "Main features",
      features: [
        "Product management",
        "Stock entries and exits",
        "Inventory movement tracking",
        "Search and filtering",
        "User management",
        "Barcode scanning",
      ],

      creatorTitle: "Developed by",
      creatorName: "Latifa El Guerouani",
      education: "Software and Application Development",
      school: "ENSA Agadir",

      internship: "Internship — ONEE Water Branch",
      year: "2026",

      technologiesTitle: "Technologies",
      contactTitle: "Contact & profiles",

      email: "Email",
      github: "GitHub",
      linkedin: "LinkedIn",

      version: "Version 1.0.0",
    },

    ar: {
      title: "حول StockTrace",
      subtitle: "إدارة ذكية للمخزون",
      description:
        "StockTrace هو تطبيق لإدارة وتتبع المخزون، تم تصميمه لتسهيل إدارة المنتجات وعمليات دخول وخروج المخزون وتتبع حركات المخزون.",

      featuresTitle: "الميزات الرئيسية",
      features: [
        "إدارة المنتجات",
        "عمليات دخول وخروج المخزون",
        "تتبع حركات المخزون",
        "البحث والتصفية",
        "إدارة المستخدمين",
        "مسح الباركود",
      ],

      creatorTitle: "تم تطويره بواسطة",
      creatorName: "Latifa El Guerouani",
      education: "تطوير البرمجيات والتطبيقات",
      school: "ENSA Agadir",

      internship: "التدريب — ONEE فرع الماء",
      year: "2026",

      technologiesTitle: "التقنيات المستخدمة",
      contactTitle: "التواصل والملفات الشخصية",

      email: "البريد الإلكتروني",
      github: "GitHub",
      linkedin: "LinkedIn",

      version: "الإصدار 1.0.0",
    },
  };

  const c = content[lang] || content.en;

  return (
    <>
      <PageHead
        title={c.title}
        subtitle={c.subtitle}
      />

      <div className="about-page">

        {/* INTRODUCTION */}
        <section className="panel about-hero">
          <div className="about-logo">
            <Box size={32} />
          </div>

          <div className="about-intro">
            <span className="eyebrow">STOCKTRACE</span>

            <h2>{c.subtitle}</h2>

            <p>
              {c.description}
            </p>
          </div>
        </section>


        {/* FEATURES */}
        <section className="panel about-card">
          <div className="panel-head">
            <div>
              <span className="eyebrow">
                STOCKTRACE
              </span>

              <h3>
                {c.featuresTitle}
              </h3>
            </div>
          </div>

          <div className="about-features">
            {c.features.map((feature, index) => (
              <div className="about-feature" key={index}>
                <div className="about-feature-icon">
                  <ShieldCheck size={18} />
                </div>

                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>


        {/* CREATOR + CONTACT */}
        <div className="about-grid">

          {/* CREATOR */}
          <section className="panel about-card">

            <div className="panel-head">
              <div>
                <span className="eyebrow">
                  {c.creatorTitle}
                </span>

                <h3>
                  {c.creatorName}
                </h3>
              </div>
            </div>

            <div className="creator-profile">

              <div className="creator-avatar">
                LE
              </div>

              <div className="creator-info">
                <strong>
                  {c.creatorName}
                </strong>

                <span>
                  {c.education}
                </span>

                <span>
                  {c.school}
                </span>

                <small>
                  {c.internship}
                </small>

                <small>
                  {c.year}
                </small>
              </div>

            </div>

          </section>


          {/* CONTACT */}
          <section className="panel about-card">

            <div className="panel-head">
              <div>
                <span className="eyebrow">
                  CONTACT
                </span>

                <h3>
                  {c.contactTitle}
                </h3>
              </div>
            </div>

            <div className="contact-links">

              <a
                href="mailto:latifaelguerouani@gmail.com"
                className="contact-link"
              >
                <div className="contact-icon">
                  <UserRound size={18} />
                </div>

                <div>
                  <strong>{c.email}</strong>
                  <span>
                    latifaelguerouani@gmail.com
                  </span>
                </div>
              </a>


              <a
                href="https://github.com/latifaelguerouani-01"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                <div className="contact-icon">
                  <Activity size={18} />
                </div>

                <div>
                  <strong>{c.github}</strong>
                  <span>
                    github.com/latifaelguerouani-01
                  </span>
                </div>

                <ChevronRight size={17} />
              </a>


              <a
                href="https://www.linkedin.com/in/latifa-el-guerouani-2004f/"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                <div className="contact-icon">
                  <UserRound size={18} />
                </div>

                <div>
                  <strong>{c.linkedin}</strong>
                  <span>
                    linkedin.com/in/latifa-el-guerouani-2004f
                  </span>
                </div>

                <ChevronRight size={17} />
              </a>

            </div>

          </section>

        </div>


        {/* TECHNOLOGIES */}
        <section className="panel about-card">

          <div className="panel-head">
            <div>
              <span className="eyebrow">
                TECH STACK
              </span>

              <h3>
                {c.technologiesTitle}
              </h3>
            </div>
          </div>

          <div className="tech-list">
            <span>React</span>
            <span>Spring Boot</span>
            <span>Java</span>
            <span>MySQL</span>
            <span>REST API</span>
          </div>

        </section>


        {/* FOOTER */}
        <div className="about-footer">
          <span>© {new Date().getFullYear()} StockTrace</span>
          <span>{c.version}</span>
        </div>

      </div>
    </>
  );
}
function Setting({icon:Icon,label,children}){return <div className="setting-row"><div className="setting-label"><Icon size={18}/><span>{label}</span></div>{children}</div>}
function Field({label,children,extra}){return <label className="field"><div className="field-label"><span>{label}</span>{extra}</div>{children}</label>}
// ===============================
// CATEGORY TRANSLATIONS
// ===============================

const CATEGORY_TRANSLATIONS = {
  fr: {
    "API": "API",
    "Batterie de condensateur": "Batterie de condensateur",
    "Bloc différentiel": "Bloc différentiel",
    "Contact auxiliaire": "Contact auxiliaire",
    "Contacteur": "Contacteur",
    "Controleur de gestion de moteurs": "Controleur de gestion de moteurs",
    "Disjoncteur": "Disjoncteur",
    "Disjoncteur Moteur": "Disjoncteur Moteur",
    "Disjoncteur/ Déclencheur": "Disjoncteur/ Déclencheur",
    "Démarreur": "Démarreur",
    "Instrumentation": "Instrumentation",
    "Interrupteur Sectionneur": "Interrupteur Sectionneur",
    "Interrupteur-Sectionneur": "Interrupteur-Sectionneur",
    "P Recharge VAR": "P Recharge VAR",
    "Relais auxiliaire": "Relais auxiliaire",
    "Sectionneur": "Sectionneur",
    "VarMT": "VarMT",
    "Variateur": "Variateur",
    "Ventilateur": "Ventilateur",

    "Accouplement": "Accouplement",
    "Arbre": "Arbre",
    "Débitmètre": "Débitmètre",
    "Garniture mécanique": "Garniture mécanique",
    "Joint spiralé": "Joint spiralé",
    "Kit palier": "Kit palier",
    "Labyrinthe": "Labyrinthe",
    "Manomètre": "Manomètre",
    "Piston": "Piston",
    "Pompe": "Pompe",
    "Pompe chaux": "Pompe chaux",
    "Pompe doseuse": "Pompe doseuse",
    "Pompe vide-cave": "Pompe vide-cave",
    "Pompe vide-fût": "Pompe vide-fût",
    "Pressostat": "Pressostat",
    "Roue": "Roue",
    "Roulement": "Roulement",
  },

  en: {
    "API": "API",
    "Batterie de condensateur": "Capacitor Bank",
    "Bloc différentiel": "Residual Current Block",
    "Contact auxiliaire": "Auxiliary Contact",
    "Contacteur": "Contactor",
    "Controleur de gestion de moteurs": "Motor Management Controller",
    "Disjoncteur": "Circuit Breaker",
    "Disjoncteur Moteur": "Motor Circuit Breaker",
    "Disjoncteur/ Déclencheur": "Circuit Breaker / Trip Unit",
    "Démarreur": "Starter",
    "Instrumentation": "Instrumentation",
    "Interrupteur Sectionneur": "Switch Disconnector",
    "Interrupteur-Sectionneur": "Switch Disconnector",
    "P Recharge VAR": "VAR Compensation",
    "Relais auxiliaire": "Auxiliary Relay",
    "Sectionneur": "Disconnector",
    "VarMT": "MV VAR",
    "Variateur": "Variable Speed Drive",
    "Ventilateur": "Fan",

    "Accouplement": "Coupling",
    "Arbre": "Shaft",
    "Débitmètre": "Flow Meter",
    "Garniture mécanique": "Mechanical Seal",
    "Joint spiralé": "Spiral Wound Gasket",
    "Kit palier": "Bearing Kit",
    "Labyrinthe": "Labyrinth Seal",
    "Manomètre": "Pressure Gauge",
    "Piston": "Piston",
    "Pompe": "Pump",
    "Pompe chaux": "Lime Pump",
    "Pompe doseuse": "Dosing Pump",
    "Pompe vide-cave": "Sump Pump",
    "Pompe vide-fût": "Drum Pump",
    "Pressostat": "Pressure Switch",
    "Roue": "Wheel",
    "Roulement": "Bearing",
  },

  ar: {
    "API": "API",
    "Batterie de condensateur": "بنك المكثفات",
    "Bloc différentiel": "قاطع تفاضلي",
    "Contact auxiliaire": "ملامس مساعد",
    "Contacteur": "كونتاكتور",
    "Controleur de gestion de moteurs": "وحدة التحكم في المحركات",
    "Disjoncteur": "قاطع كهربائي",
    "Disjoncteur Moteur": "قاطع حماية المحرك",
    "Disjoncteur/ Déclencheur": "قاطع / وحدة فصل",
    "Démarreur": "بادئ تشغيل",
    "Instrumentation": "أجهزة القياس",
    "Interrupteur Sectionneur": "مفتاح فصل",
    "Interrupteur-Sectionneur": "مفتاح فصل",
    "P Recharge VAR": "تعويض القدرة غير الفعالة",
    "Relais auxiliaire": "مرحل مساعد",
    "Sectionneur": "فاصل كهربائي",
    "VarMT": "تعويض الجهد المتوسط",
    "Variateur": "مغير السرعة",
    "Ventilateur": "مروحة",

    "Accouplement": "وصلة ميكانيكية",
    "Arbre": "عمود",
    "Débitmètre": "مقياس التدفق",
    "Garniture mécanique": "مانع تسرب ميكانيكي",
    "Joint spiralé": "حشية حلزونية",
    "Kit palier": "طقم المحمل",
    "Labyrinthe": "مانع تسرب متاهة",
    "Manomètre": "مقياس الضغط",
    "Piston": "مكبس",
    "Pompe": "مضخة",
    "Pompe chaux": "مضخة الجير",
    "Pompe doseuse": "مضخة الجرعات",
    "Pompe vide-cave": "مضخة تصريف",
    "Pompe vide-fût": "مضخة تفريغ البراميل",
    "Pressostat": "مفتاح الضغط",
    "Roue": "عجلة",
    "Roulement": "محمل",
  },
};


// ===============================
// TRANSLATE CATEGORY
// ===============================

const translateCategory = (name, lang) => {
  if (!name) return "—";

  return CATEGORY_TRANSLATIONS[lang]?.[name] || name;
};
