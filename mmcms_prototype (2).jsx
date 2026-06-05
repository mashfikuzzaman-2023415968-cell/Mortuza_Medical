import { useState } from "react";
import {
  Search, Menu, LogOut, Users, CreditCard, Hash, Stethoscope, ClipboardList,
  Pill, FlaskConical, BedDouble, Ambulance, Calendar, BarChart3, Activity,
  AlertTriangle, Plus, Eye, ArrowLeft, Check, X, Clock, User, Shield,
  HeartPulse, FileText, Edit, Trash2, RotateCcw, UserPlus
} from "lucide-react";

const M = {
  patients: [
    { id:1, name:"Rakibul Hasan", cat:"STUDENT", dept:"CSE", uid:"BSc-CSE-2101", gender:"M", blood:"O+", phone:"01710000001", card:"HC-2025-0001", cs:"ACTIVE", exp:"2027-01-10" },
    { id:2, name:"Sadia Afrin", cat:"STUDENT", dept:"EEE", uid:"BSc-EEE-2055", gender:"F", blood:"A+", phone:"01710000002", card:"HC-2025-0002", cs:"ACTIVE", exp:"2027-01-11" },
    { id:3, name:"Tanvir Ahmed", cat:"STUDENT", dept:"Physics", uid:"BSc-PHY-1990", gender:"M", blood:"B+", phone:"01710000003", card:"HC-2025-0003", cs:"ACTIVE", exp:"2027-01-12" },
    { id:4, name:"Nusrat Jahan", cat:"STUDENT", dept:"English", uid:"BA-ENG-2210", gender:"F", blood:"AB+", phone:"01710000004", card:"HC-2025-0004", cs:"ACTIVE", exp:"2027-01-13" },
    { id:5, name:"Mehedi Hasan", cat:"STUDENT", dept:"Chemistry", uid:"MSc-CHE-1820", gender:"M", blood:"O-", phone:"01710000005", card:"HC-2025-0005", cs:"ACTIVE", exp:"2027-01-14" },
    { id:9, name:"Arif Mahmud", cat:"STUDENT", dept:"Statistics", uid:"BSc-STA-2120", gender:"M", blood:"B+", phone:"01710000009", card:"HC-2024-0009", cs:"ACTIVE", exp:"2026-02-04" },
    { id:10, name:"Tahmina Begum", cat:"STUDENT", dept:"Botany", uid:"MSc-BOT-1750", gender:"F", blood:"AB-", phone:"01710000010", card:"HC-2024-0010", cs:"EXPIRED", exp:"2026-05-01" },
    { id:11, name:"Prof. Dr. Kamrul Hasan", cat:"TEACHER", dept:"CSE", uid:"EMP-T-3012", gender:"M", blood:"O+", phone:"01720000011", card:"HC-2024-0011", cs:"ACTIVE", exp:"2026-09-01" },
    { id:12, name:"Prof. Shahnaz Parvin", cat:"TEACHER", dept:"English", uid:"EMP-T-3045", gender:"F", blood:"A+", phone:"01720000012", card:"HC-2024-0012", cs:"ACTIVE", exp:"2026-09-02" },
    { id:13, name:"Dr. Mizanur Rahman", cat:"TEACHER", dept:"Physics", uid:"EMP-T-3078", gender:"M", blood:"B+", phone:"01720000013", card:"HC-2024-0013", cs:"SUSPENDED", exp:"2026-09-03" },
    { id:14, name:"Abdul Karim", cat:"STAFF", dept:"Administration", uid:"EMP-S-5001", gender:"M", blood:"O+", phone:"01730000014", card:"HC-2024-0014", cs:"ACTIVE", exp:"2026-10-01" },
    { id:17, name:"Ayesha Kamrul", cat:"FAMILY", dept:null, uid:null, gender:"F", blood:"O+", phone:"01720000017", card:"HC-2024-0017", cs:"ACTIVE", exp:"2026-09-05", guardian:"Prof. Dr. Kamrul Hasan" },
    { id:19, name:"Rezaul Karim", cat:"FAMILY", dept:null, uid:null, gender:"M", blood:"O+", phone:null, card:"HC-2024-0019", cs:"ACTIVE", exp:"2026-10-05", guardian:"Abdul Karim" },
  ],
  doctors: [
    { id:1, name:"Dr. Mohammad Tanvir Ali", type:"GENERAL", desig:"Chief Medical Officer", unit:"Outpatient (Male)", phone:"01772133301", pt:false },
    { id:2, name:"Mrs. Razia Rahman", type:"GENERAL", desig:"Senior MO", unit:"Outpatient (F&C)", phone:"01817516559", pt:false },
    { id:3, name:"A.M. Sazzad Hossain", type:"GENERAL", desig:"Senior MO", unit:"Outpatient (Male)", phone:"01552470474", pt:false },
    { id:4, name:"Sharif Qamar Uddin", type:"GENERAL", desig:"Senior MO", unit:"Outpatient (Male)", phone:"01712598031", pt:false },
    { id:6, name:"Ferdousi Purabi Chowdhury", type:"GENERAL", desig:"Senior MO", unit:"Outpatient (F&C)", phone:"01712160744", pt:false },
    { id:20, name:"Dr. S.M. Shamima Parvin", type:"DENTAL", desig:"Senior MO", unit:"Dental Unit", phone:"01818373258", pt:false },
    { id:21, name:"Dr. Rathindranath Sarkar", type:"DENTAL", desig:"Senior MO", unit:"Dental Unit", phone:"01716226189", pt:false },
    { id:22, name:"Dr. Md. Zakir Hossain", type:"EYE", desig:"Medical Officer", unit:"Eye Unit", phone:"01715026128", pt:false },
    { id:25, name:"Dr. Md. Zakaria", type:"SPECIALIST", desig:"Part-time (ENT)", unit:"Outpatient (Male)", phone:"01716578378", pt:true },
    { id:26, name:"Dr. Md. Sirajul Haque", type:"SPECIALIST", desig:"Part-time (Cardio)", unit:"Outpatient (Male)", phone:"01819291182", pt:true },
    { id:31, name:"Dr. Aminul Haque", type:"HOMEO", desig:"Homeo MO", unit:"Homeo Unit", phone:"01700000031", pt:false },
    { id:32, name:"Dr. Sufia Khatun", type:"HOMEO", desig:"Homeo MO", unit:"Homeo Unit", phone:"01700000032", pt:false },
  ],
  units: ["Outpatient (Male)","Outpatient (F&C)","Dental Unit","Eye Unit","Homeo Unit","Physiotherapy","Pathology Lab","Radiology"],
  roster: [
    { doctor:"Ferdousi Purabi Chowdhury", shift:"Morning", unit:"Outpatient (F&C)", date:"2026-01-04", oc:false },
    { doctor:"Mrs. Razia Rahman", shift:"Morning", unit:"Outpatient (F&C)", date:"2026-01-04", oc:false },
    { doctor:"Sharif Qamar Uddin", shift:"Morning", unit:"Outpatient (Male)", date:"2026-01-04", oc:false },
    { doctor:"A.M. Sazzad Hossain", shift:"Afternoon", unit:"Outpatient (Male)", date:"2026-01-04", oc:false },
    { doctor:"Sayed Al Amin Anhar", shift:"Night", unit:"Outpatient (Male)", date:"2026-01-04", oc:true },
    { doctor:"Dr. S.M. Shamima Parvin", shift:"Morning", unit:"Dental Unit", date:"2026-01-05", oc:false },
    { doctor:"Dr. Md. Zakir Hossain", shift:"Morning", unit:"Eye Unit", date:"2026-01-05", oc:false },
    { doctor:"Dr. Md. Zakaria", shift:"Morning", unit:"Outpatient (Male)", date:"2026-01-05", oc:false },
  ],
  tokens: [
    { id:1, n:1, pat:"Rakibul Hasan", unit:"Outpatient (Male)", st:"SERVED", date:"2026-01-04", time:"08:20" },
    { id:2, n:2, pat:"Tanvir Ahmed", unit:"Outpatient (Male)", st:"SERVED", date:"2026-01-04", time:"08:35" },
    { id:5, n:3, pat:"Rakibul Hasan", unit:"Outpatient (Male)", st:"CANCELLED", date:"2026-01-04", time:"09:30" },
    { id:14, n:1, pat:"Sabbir Kamrul", unit:"Outpatient (Male)", st:"WAITING", date:"2026-01-09", time:"09:15" },
    { id:15, n:2, pat:"Mehedi Hasan", unit:"Outpatient (Male)", st:"WAITING", date:"2026-01-09", time:"09:30" },
    { id:16, n:1, pat:"Nusrat Jahan", unit:"Outpatient (F&C)", st:"WAITING", date:"2026-01-09", time:"09:45" },
    { id:17, n:2, pat:"Farhana Akter", unit:"Outpatient (F&C)", st:"WAITING", date:"2026-01-09", time:"10:00" },
  ],
  visits: [
    { id:1, pat:"Rakibul Hasan", doc:"Sharif Qamar Uddin", date:"2026-01-04", type:"NEW", comp:"Fever and headache for 3 days", diag:"Viral fever", bp:"110/70", temp:101.4, wt:62.5, pulse:88, fu:"2026-01-09" },
    { id:2, pat:"Tanvir Ahmed", doc:"Sharif Qamar Uddin", date:"2026-01-04", type:"NEW", comp:"Sore throat, cough", diag:"Acute pharyngitis", bp:"115/75", temp:100.2, wt:68, pulse:80, fu:null },
    { id:3, pat:"Sadia Afrin", doc:"Ferdousi Purabi Chowdhury", date:"2026-01-04", type:"NEW", comp:"Abdominal pain", diag:"Gastritis", bp:"100/65", temp:98.6, wt:55.2, pulse:76, fu:"2026-01-11" },
    { id:5, pat:"Mehedi Hasan", doc:"A.M. Sazzad Hossain", date:"2026-01-05", type:"NEW", comp:"Body ache, weakness", diag:"Anaemia suspected", bp:"120/80", temp:98.8, wt:70, pulse:82, fu:"2026-01-15" },
    { id:10, pat:"Prof. Dr. Kamrul Hasan", doc:"Sharif Qamar Uddin", date:"2026-01-06", type:"NEW", comp:"Chest discomfort", diag:"Hypertension follow-up", bp:"140/90", temp:98.6, wt:80, pulse:84, fu:"2026-01-13" },
    { id:13, pat:"Dr. Md. Nazrul Islam", doc:"Sayed Al Amin Anhar", date:"2026-01-07", type:"EMERGENCY", comp:"Severe abdominal pain at night", diag:"Renal colic", bp:"135/88", temp:99.2, wt:78, pulse:96, fu:null },
  ],
  rxs: [
    { id:1, pat:"Rakibul Hasan", doc:"Sharif Qamar Uddin", date:"2026-01-04", adv:"Plenty of fluids and rest", items:[{m:"Napa 500mg",d:"1+1+1",dy:5,q:15,i:"After meal"},{m:"Histacin 4mg",d:"0+0+1",dy:5,q:5,i:"At night"}] },
    { id:2, pat:"Tanvir Ahmed", doc:"Sharif Qamar Uddin", date:"2026-01-04", adv:"Warm saline gargle", items:[{m:"Moxacil 500mg",d:"1+0+1",dy:7,q:14,i:"After meal"},{m:"Napa 500mg",d:"1+0+1",dy:3,q:6,i:"If fever"}] },
    { id:3, pat:"Sadia Afrin", doc:"Ferdousi Purabi Chowdhury", date:"2026-01-04", adv:"Avoid spicy food", items:[{m:"Seclo 20mg",d:"1+0+0",dy:14,q:14,i:"Before breakfast"},{m:"Diclofen 50mg",d:"1+0+1",dy:5,q:10,i:"After meal"}] },
    { id:5, pat:"Mehedi Hasan", doc:"A.M. Sazzad Hossain", date:"2026-01-05", adv:"Iron-rich diet", items:[{m:"Ceevit 250mg",d:"1+0+1",dy:30,q:60,i:"After meal"}] },
  ],
  meds: [
    { id:1, name:"Napa", gen:"Paracetamol", form:"TABLET", str:"500mg", price:1.2, stk:5000, ro:500 },
    { id:2, name:"Ace", gen:"Paracetamol", form:"TABLET", str:"500mg", price:1.5, stk:300, ro:500 },
    { id:3, name:"Seclo", gen:"Omeprazole", form:"CAPSULE", str:"20mg", price:6, stk:2000, ro:300 },
    { id:9, name:"Moxacil", gen:"Amoxicillin", form:"CAPSULE", str:"500mg", price:4, stk:1800, ro:300 },
    { id:10, name:"Zithrin", gen:"Azithromycin", form:"TABLET", str:"500mg", price:28, stk:600, ro:100 },
    { id:11, name:"Cef-3", gen:"Cefixime", form:"CAPSULE", str:"400mg", price:35, stk:40, ro:100 },
    { id:12, name:"Orsaline-N", gen:"ORS", form:"POWDER", str:"20.5g", price:5, stk:3000, ro:500 },
    { id:13, name:"Ceevit", gen:"Vitamin C", form:"TABLET", str:"250mg", price:1, stk:5000, ro:500 },
    { id:18, name:"Diclofen", gen:"Diclofenac", form:"TABLET", str:"50mg", price:1.8, stk:2200, ro:300 },
    { id:21, name:"Arnica Montana", gen:"Arnica", form:"DROPS", str:"30C", price:0, stk:400, ro:50, hom:true },
    { id:22, name:"Nux Vomica", gen:"Nux Vomica", form:"DROPS", str:"30C", price:0, stk:400, ro:50, hom:true },
  ],
  tests: [
    { id:1, pat:"Mehedi Hasan", test:"CBC", cat:"PATHOLOGY", st:"COMPLETED", res:"Hb 9.8 g/dL (low)", date:"2026-01-05", doc:"A.M. Sazzad Hossain" },
    { id:3, pat:"Prof. Dr. Kamrul Hasan", test:"Lipid Profile", cat:"PATHOLOGY", st:"COMPLETED", res:"LDL 165 mg/dL (high)", date:"2026-01-06", doc:"Sharif Qamar Uddin" },
    { id:4, pat:"Prof. Dr. Kamrul Hasan", test:"ECG", cat:"ECG", st:"ORDERED", res:null, date:"2026-01-06", doc:"Sharif Qamar Uddin" },
    { id:6, pat:"Dr. Md. Nazrul Islam", test:"Ultrasonogram", cat:"ULTRASOUND", st:"ORDERED", res:null, date:"2026-01-07", doc:"Sayed Al Amin Anhar" },
    { id:7, pat:"Prof. Shahnaz Parvin", test:"X-ray Chest", cat:"RADIOLOGY", st:"COMPLETED", res:"Mild bronchovascular markings", date:"2026-01-06", doc:"Mrs. Razia Rahman" },
    { id:10, pat:"Rezaul Karim", test:"CBC", cat:"PATHOLOGY", st:"SAMPLE_COLLECTED", res:null, date:"2026-01-08", doc:"Dr. Mahbuba Akter" },
    { id:12, pat:"Abdul Karim", test:"HbA1C", cat:"PATHOLOGY", st:"COMPLETED", res:"5.9% (pre-diabetic)", date:"2026-01-07", doc:"Dr. Aminul Haque" },
  ],
  catalogue: [
    { name:"CBC", cat:"PATHOLOGY", sam:"Blood", range:"WBC 4-11", days:"SAT-THU" },
    { name:"FBS", cat:"PATHOLOGY", sam:"Blood", range:"3.9-5.5 mmol/L", days:"SAT-THU" },
    { name:"SGPT", cat:"PATHOLOGY", sam:"Blood", range:"7-56 U/L", days:"SAT-THU" },
    { name:"Serum Creatinine", cat:"PATHOLOGY", sam:"Blood", range:"0.6-1.3 mg/dL", days:"SAT-THU" },
    { name:"Urine R/E", cat:"PATHOLOGY", sam:"Urine", range:"-", days:"SAT-THU" },
    { name:"HbA1C", cat:"PATHOLOGY", sam:"Blood", range:"<5.7%", days:"SAT-THU" },
    { name:"X-ray Chest P/A", cat:"RADIOLOGY", sam:null, range:"-", days:"SAT-THU" },
    { name:"ECG", cat:"ECG", sam:null, range:"-", days:"SAT-THU" },
    { name:"Ultrasonogram W/A", cat:"ULTRASOUND", sam:null, range:"-", days:"TUE,WED,THU" },
  ],
  beds: [
    { bed:"ISO-01", dis:"Chicken Pox", pat:"Sumaiya Islam", occ:true },
    { bed:"ISO-02", dis:"Chicken Pox", pat:null, occ:false },
    { bed:"ISO-03", dis:"Chicken Pox", pat:"Arif Mahmud", occ:true },
    { bed:"ISO-11", dis:"Mumps", pat:"Rezaul Karim", occ:true },
    { bed:"ISO-12", dis:"Mumps", pat:null, occ:false },
    { bed:"ISO-21", dis:"General", pat:null, occ:false },
  ],
  ambs: [
    { id:1, reg:"Dhaka Metro-Ga-13-2045", model:"Toyota Hiace", driver:"Md. Jashim Uddin", phone:"01798762920", st:"IN_SERVICE", trip:true, trips:4 },
    { id:2, reg:"Dhaka Metro-Ga-11-7788", model:"Nissan Urvan", driver:"Md. Sohel Rana", phone:"01711000022", st:"MAINTENANCE", trip:false, trips:2 },
  ],
  dispatches: [
    { amb:"Ga-13-2045", pat:"Dr. Nazrul Islam", dest:"Dhaka Medical College", type:"EMERGENCY", st:"COMPLETED", date:"2026-01-07", auth:"Sayed Al Amin Anhar" },
    { amb:"Ga-13-2045", pat:"Rezaul Karim", dest:"BSMMU", type:"EMERGENCY", st:"COMPLETED", date:"2026-01-08", auth:"Dr. Mahbuba Akter" },
    { amb:"Ga-11-7788", pat:null, dest:"Square Hospital", type:"TRANSFER", st:"COMPLETED", date:"2026-01-05", auth:null },
    { amb:"Ga-13-2045", pat:null, dest:"Holy Family Hospital", type:"EMERGENCY", st:"DISPATCHED", date:"2026-01-09", auth:"Sayed Al Amin Anhar" },
    { amb:"Ga-11-7788", pat:"Tanvir Ahmed", dest:"Birdem Hospital", type:"REFERRAL", st:"CANCELLED", date:"2026-01-02", auth:"Sharif Qamar Uddin" },
  ],
  dispLog: [
    { pat:"Rakibul Hasan", cat:"STUDENT", items:2, amt:0, by:"Md. Rubel Mahmud", date:"2026-01-04" },
    { pat:"Tanvir Ahmed", cat:"STUDENT", items:2, amt:0, by:"Mst. Fahima Akter", date:"2026-01-04" },
    { pat:"Prof. Dr. Kamrul Hasan", cat:"TEACHER", items:1, amt:225, by:"Md. Rubel Mahmud", date:"2026-01-06" },
    { pat:"Prof. Shahnaz Parvin", cat:"TEACHER", items:2, amt:169, by:"Mst. Fahima Akter", date:"2026-01-06" },
    { pat:"Abdul Karim", cat:"STAFF", items:2, amt:0, by:"Md. Rubel Mahmud", date:"2026-01-07" },
  ],
  users: [
    { user:"admin", role:"ADMIN", linked:null, active:true },
    { user:"dr.tanvir", role:"DOCTOR", linked:"Dr. Tanvir Ali", active:true },
    { user:"reception1", role:"RECEPTIONIST", linked:null, active:true },
    { user:"pharm.rubel", role:"PHARMACIST", linked:null, active:true },
    { user:"lab.faruque", role:"LAB_TECH", linked:null, active:true },
    { user:"patient.rakib", role:"PATIENT", linked:"Rakibul Hasan", active:true },
  ],
};

const ROLES = [
  { key:"ADMIN", label:"Admin", icon:Shield, user:"admin", color:"from-violet-600 to-purple-700" },
  { key:"RECEPTIONIST", label:"Receptionist", icon:CreditCard, user:"reception1", color:"from-sky-600 to-cyan-700" },
  { key:"DOCTOR", label:"Doctor", icon:Stethoscope, user:"dr.tanvir", color:"from-emerald-600 to-teal-700" },
  { key:"PHARMACIST", label:"Pharmacist", icon:Pill, user:"pharm.rubel", color:"from-amber-500 to-orange-600" },
  { key:"LAB_TECH", label:"Lab Technician", icon:FlaskConical, user:"lab.faruque", color:"from-rose-500 to-pink-600" },
  { key:"PATIENT", label:"Patient", icon:User, user:"patient.rakib", color:"from-slate-500 to-gray-600" },
];

/* ══════ Shared UI ══════ */
const bv = { default:"bg-gray-100 text-gray-700", active:"bg-emerald-50 text-emerald-700 border border-emerald-200", waiting:"bg-amber-50 text-amber-700 border border-amber-200", served:"bg-blue-50 text-blue-700 border border-blue-200", emergency:"bg-red-50 text-red-700 border border-red-200", completed:"bg-emerald-50 text-emerald-700 border border-emerald-200", ordered:"bg-amber-50 text-amber-700 border border-amber-200", sample_collected:"bg-cyan-50 text-cyan-700 border border-cyan-200", cancelled:"bg-gray-200 text-gray-500", dispatched:"bg-red-50 text-red-700 border border-red-200", student:"bg-sky-50 text-sky-700", teacher:"bg-violet-50 text-violet-700", staff:"bg-teal-50 text-teal-700", family:"bg-pink-50 text-pink-700", maintenance:"bg-orange-50 text-orange-700 border border-orange-200", in_service:"bg-emerald-50 text-emerald-700 border border-emerald-200", low:"bg-red-50 text-red-700 border border-red-200", expired:"bg-gray-200 text-gray-600", suspended:"bg-orange-50 text-orange-700 border border-orange-200", general:"bg-sky-50 text-sky-700", specialist:"bg-violet-50 text-violet-700", dental:"bg-teal-50 text-teal-700", eye:"bg-cyan-50 text-cyan-700", homeo:"bg-green-50 text-green-700", physio:"bg-amber-50 text-amber-700", new:"bg-sky-50 text-sky-700", morning:"bg-amber-50 text-amber-700", afternoon:"bg-sky-50 text-sky-700", night:"bg-indigo-50 text-indigo-700", occupied:"bg-red-50 text-red-700 border border-red-200", free:"bg-emerald-50 text-emerald-700 border border-emerald-200", pathology:"bg-purple-50 text-purple-700", radiology:"bg-blue-50 text-blue-700", ecg:"bg-rose-50 text-rose-700", ultrasound:"bg-teal-50 text-teal-700" };

function B({ children, v = "default" }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${bv[v] || bv.default}`}>{children}</span>;
}

function Stat({ icon: I, label, value, sub, a = "text-sky-600" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-gray-50 ${a}`}><I size={20} /></div>
      </div>
    </div>
  );
}

function F({ label, type = "text", options, placeholder, required, dv, ta, disabled }) {
  const c = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none bg-white disabled:bg-gray-50";
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {options ? (
        <select className={c} defaultValue={dv || ""} disabled={disabled}>
          <option value="">Select...</option>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : ta ? (
        <textarea className={c + " h-20 resize-none"} placeholder={placeholder} defaultValue={dv} disabled={disabled} />
      ) : (
        <input type={type} className={c} placeholder={placeholder} defaultValue={dv} disabled={disabled} />
      )}
    </div>
  );
}

function Cd({ children, className = "" }) {
  return <div className={`bg-white rounded-xl border border-gray-100 p-5 shadow-sm ${className}`}>{children}</div>;
}

function Hdr({ title, action, onAction, icon: I }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {action && <button onClick={onAction} className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700">{I && <I size={14} />}{action}</button>}
    </div>
  );
}

function Tbl({ cols, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 text-xs border-b">{cols.map((c, i) => <th key={i} className="pb-2 font-medium pr-3">{c.l}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">{cols.map((c, j) => <td key={j} className="py-2.5 pr-3">{c.r ? c.r(r) : r[c.k]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Abtn({ icon: I, label, color = "sky", onClick }) {
  const cs = { sky:"bg-sky-600 hover:bg-sky-700", emerald:"bg-emerald-600 hover:bg-emerald-700", amber:"bg-amber-500 hover:bg-amber-600", rose:"bg-rose-500 hover:bg-rose-600", violet:"bg-violet-600 hover:bg-violet-700" };
  return <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 ${cs[color] || cs.sky} text-white rounded-lg text-xs font-medium`}>{I && <I size={14} />}{label}</button>;
}

function ED({ onEdit, onDel }) {
  return (
    <div className="flex gap-1">
      {onEdit && <button onClick={onEdit} className="p-1.5 text-sky-500 hover:bg-sky-50 rounded"><Edit size={14} /></button>}
      {onDel && <button onClick={onDel} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>}
    </div>
  );
}

function TokenQ({ tokens, onStart }) {
  return (
    <div className="space-y-2">
      {tokens.map(t => (
        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-3">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${t.st === "WAITING" ? "bg-amber-100 text-amber-700" : t.st === "CANCELLED" ? "bg-gray-100 text-gray-400" : "bg-blue-100 text-blue-600"}`}>{t.n}</span>
            <div><p className="text-sm font-medium text-gray-800">{t.pat}</p><p className="text-xs text-gray-400">{t.unit} · {t.time}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {t.st === "WAITING" && onStart ? <Abtn icon={Stethoscope} label="Start visit" color="emerald" onClick={() => onStart(t.pat)} /> : <B v={t.st.toLowerCase()}>{t.st}</B>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════ ADMIN PAGES ══════ */
function ADash() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total patients" value="13" />
        <Stat icon={Stethoscope} label="Visits today" value="6" sub="1 emergency" a="text-emerald-600" />
        <Stat icon={Pill} label="Revenue" value="৳394" a="text-amber-600" />
        <Stat icon={BedDouble} label="Beds" value="3/30" a="text-rose-600" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Cd>
          <Hdr title="Ambulance fleet" />
          {M.ambs.map(a => <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"><div><p className="text-sm font-medium text-gray-800">{a.reg}</p><p className="text-xs text-gray-400">{a.driver}</p></div><B v={a.st === "MAINTENANCE" ? "maintenance" : a.trip ? "dispatched" : "in_service"}>{a.st === "MAINTENANCE" ? "Maintenance" : a.trip ? "On trip" : "Available"}</B></div>)}
        </Cd>
        <Cd>
          <Hdr title="Doctor workload" />
          {[{n:"Sharif Qamar Uddin",v:4},{n:"Mrs. Razia Rahman",v:3},{n:"Ferdousi Purabi Chowdhury",v:2}].map((d,i) => <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"><span className="text-xs text-gray-400 w-4">{i+1}</span><div className="flex-1 text-sm text-gray-700">{d.n}</div><div className="w-20 bg-gray-100 rounded-full h-2"><div className="bg-teal-500 h-2 rounded-full" style={{width:`${d.v/4*100}%`}} /></div><span className="text-xs text-gray-500 w-6 text-right">{d.v}</span></div>)}
        </Cd>
      </div>
    </div>
  );
}
function ADocs() { return <Cd><Hdr title="Doctor directory" action="Add doctor" icon={Plus} /><Tbl cols={[{l:"Name",r:r => <span className="font-medium text-gray-800">{r.name}</span>},{l:"Type",r:r => <B v={r.type.toLowerCase()}>{r.type}</B>},{l:"Designation",k:"desig"},{l:"Unit",r:r => <span className="text-gray-500 text-xs">{r.unit}</span>},{l:"Phone",r:r => <span className="font-mono text-xs text-gray-500">{r.phone}</span>},{l:"PT",r:r => r.pt ? <B v="maintenance">Yes</B> : <span className="text-gray-300">-</span>},{l:"",r:() => <ED onEdit={()=>{}} onDel={()=>{}} />}]} rows={M.doctors} /></Cd>; }
function ARoster() { return <Cd><Hdr title="Duty roster" action="Add assignment" icon={Plus} /><Tbl cols={[{l:"Date",k:"date"},{l:"Doctor",r:r => <span className="font-medium text-gray-800">{r.doctor}</span>},{l:"Shift",r:r => <B v={r.shift.toLowerCase()}>{r.shift}</B>},{l:"Unit",r:r => <span className="text-gray-500">{r.unit}</span>},{l:"On-call",r:r => r.oc ? <B v="dispatched">Yes</B> : <span className="text-gray-300">-</span>},{l:"",r:() => <ED onEdit={()=>{}} onDel={()=>{}} />}]} rows={M.roster} /></Cd>; }
function AAmb() { return <div className="space-y-4"><Cd><Hdr title="Fleet management" />{M.ambs.map(a => <div key={a.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100 mb-2"><div className="flex-1"><p className="text-sm font-medium text-gray-800">{a.reg}</p><p className="text-xs text-gray-400">{a.model} · {a.driver} · {a.phone}</p></div><div className="flex items-center gap-2"><B v={a.st === "MAINTENANCE" ? "maintenance" : "in_service"}>{a.st.replace("_"," ")}</B>{a.trip && <B v="dispatched">On trip</B>}<button className="px-2 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-100">Edit status</button></div></div>)}</Cd><Cd><Hdr title="Dispatch log" action="New dispatch" icon={Plus} /><Tbl cols={[{l:"Date",k:"date"},{l:"Ambulance",k:"amb"},{l:"Patient",r:r => <span className="text-gray-600">{r.pat || "-"}</span>},{l:"Dest",k:"dest"},{l:"Type",r:r => <B v="emergency">{r.type}</B>},{l:"Auth",r:r => <span className="text-xs text-gray-500">{r.auth || "-"}</span>},{l:"Status",r:r => <B v={r.st.toLowerCase()}>{r.st}</B>},{l:"",r:r => r.st === "DISPATCHED" ? <Abtn label="Mark returned" color="emerald" icon={RotateCcw} /> : null}]} rows={M.dispatches} /></Cd></div>; }
function ARep() { return <div className="space-y-4"><div className="grid md:grid-cols-2 gap-4"><Cd><Hdr title="Dispensary revenue" />{[{d:"2026-01-04",n:4,r:0},{d:"2026-01-05",n:2,r:0},{d:"2026-01-06",n:3,r:394},{d:"2026-01-07",n:2,r:0}].map((x,i) => <div key={i} className="flex justify-between py-2 border-b border-gray-50 text-sm"><span className="text-gray-600">{x.d}</span><span className="text-xs text-gray-400">{x.n} items</span><span className="font-medium text-gray-800">BDT {x.r}</span></div>)}<div className="flex justify-between pt-3 mt-1 border-t font-semibold text-sm"><span>Total</span><span className="text-emerald-600">BDT 394</span></div></Cd><Cd><Hdr title="Bed occupancy" /><div className="flex items-center gap-4 mb-4"><div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden"><div className="bg-rose-500 h-4 rounded-full" style={{width:"10%"}} /></div><span className="text-sm text-gray-600">3/30</span></div>{M.beds.filter(b => b.occ).map((b,i) => <div key={i} className="flex justify-between py-2 border-b border-gray-50 text-sm"><span className="text-gray-700">{b.bed} - {b.pat}</span><B v="emergency">{b.dis}</B></div>)}</Cd></div><Cd><Hdr title="App users" action="Add user" icon={UserPlus} /><Tbl cols={[{l:"Username",r:r => <span className="font-mono text-xs font-medium text-gray-800">{r.user}</span>},{l:"Role",r:r => <B>{r.role}</B>},{l:"Linked to",r:r => <span className="text-gray-500">{r.linked || "-"}</span>},{l:"Active",r:r => r.active ? <B v="active">Yes</B> : <B v="cancelled">No</B>},{l:"",r:() => <ED onEdit={()=>{}} />}]} rows={M.users} /></Cd></div>; }

/* ══════ RECEPTIONIST PAGES ══════ */
function RDash({ go }) { return <div className="space-y-6"><div className="grid grid-cols-3 gap-4"><Stat icon={Users} label="Patients" value="13" /><Stat icon={Hash} label="Tokens today" value="4" sub="4 waiting" a="text-amber-600" /><Stat icon={CreditCard} label="Active cards" value="10" a="text-emerald-600" /></div><Cd><Hdr title="Quick actions" /><div className="flex flex-wrap gap-3"><Abtn icon={UserPlus} label="Register patient" onClick={() => go("patients")} /><Abtn icon={Hash} label="Issue token" color="emerald" onClick={() => go("tokens")} /><Abtn icon={CreditCard} label="Issue card" color="violet" onClick={() => go("cards")} /></div></Cd></div>; }
function RPat() { const [f, sF] = useState(false); if (f) return <Cd className="max-w-2xl"><div className="flex justify-between mb-5"><h3 className="text-lg font-semibold text-gray-800">Register patient</h3><button onClick={() => sF(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div><div className="grid md:grid-cols-2 gap-4"><F label="Full name" required placeholder="e.g. Rakibul Hasan" /><F label="Date of birth" type="date" /><F label="Gender" options={["M","F"]} required /><F label="Blood group" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"]} /><F label="Phone" placeholder="01XXXXXXXXX" /><F label="Email" type="email" /><div className="md:col-span-2"><F label="Address" ta placeholder="Hall name, DU" /></div><F label="Category" options={["STUDENT","TEACHER","STAFF","FAMILY"]} required /><F label="University ID" placeholder="BSc-CSE-2101" /><F label="Department" placeholder="Computer Science" /><F label="Guardian (if FAMILY)" options={M.patients.filter(p => p.cat === "TEACHER" || p.cat === "STAFF").map(p => p.name)} /></div><div className="flex gap-3 mt-6"><Abtn label="Register" icon={Check} /><button onClick={() => sF(false)} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button></div></Cd>; return <Cd><Hdr title="Patient directory" action="Register patient" onAction={() => sF(true)} icon={Plus} /><div className="mb-4 relative"><Search size={16} className="absolute left-3 top-2.5 text-gray-300" /><input className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-64" placeholder="Search patients..." /></div><Tbl cols={[{l:"Name",r:r => <span className="font-medium text-gray-800">{r.name}</span>},{l:"Category",r:r => <B v={r.cat.toLowerCase()}>{r.cat}</B>},{l:"Dept",r:r => <span className="text-gray-500 text-xs">{r.dept || "-"}</span>},{l:"ID",r:r => <span className="font-mono text-xs text-gray-500">{r.uid || "-"}</span>},{l:"Card",r:r => <B v={r.cs.toLowerCase()}>{r.card}</B>},{l:"",r:() => <ED onEdit={() => {}} />}]} rows={M.patients} /></Cd>; }
function RCards() { return <div className="space-y-4"><Cd className="max-w-md"><Hdr title="Issue health card" /><div className="space-y-4"><F label="Patient (without card)" options={["New patient..."]} required /><F label="Expiry date" type="date" required /><div className="flex items-center gap-2"><input type="checkbox" className="rounded" /><span className="text-sm text-gray-700">Photo submitted</span></div><Abtn label="Issue card" icon={CreditCard} color="violet" /></div></Cd><Cd><Hdr title="All health cards" /><Tbl cols={[{l:"Card",r:r => <span className="font-mono text-xs font-medium">{r.card}</span>},{l:"Patient",r:r => <span className="text-gray-700">{r.name}</span>},{l:"Category",r:r => <B v={r.cat.toLowerCase()}>{r.cat}</B>},{l:"Expiry",r:r => <span className="text-xs text-gray-500">{r.exp}</span>},{l:"Status",r:r => <B v={r.cs.toLowerCase()}>{r.cs}</B>},{l:"",r:() => <button className="px-2 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-100">Change status</button>}]} rows={M.patients} /></Cd></div>; }
function RTokens() { return <div className="grid md:grid-cols-3 gap-4"><Cd><Hdr title="Issue token" /><div className="space-y-4"><F label="Patient" options={M.patients.filter(p => p.cs === "ACTIVE").map(p => p.name)} required /><F label="Unit" options={M.units.slice(0,5)} required /><Abtn label="Issue token" icon={Hash} color="emerald" /></div></Cd><div className="md:col-span-2"><Cd><Hdr title="Today's queue" /><TokenQ tokens={M.tokens.filter(t => t.date === "2026-01-09")} /></Cd></div></div>; }
function RAmb() { return <Cd className="max-w-lg"><Hdr title="Log ambulance dispatch" /><div className="space-y-4"><F label="Ambulance" options={M.ambs.map(a => a.reg + (a.st === "MAINTENANCE" ? " (MAINT.)" : a.trip ? " (ON TRIP)" : " (FREE)"))} required /><F label="Patient (optional)" options={M.patients.map(p => p.name)} /><F label="Destination" required placeholder="Hospital name" /><F label="Trip type" options={["EMERGENCY","TRANSFER","REFERRAL","PICKUP","OTHER"]} required /><F label="Requested by" placeholder="Hall authority (call slip)" /><F label="Remarks" ta /><Abtn label="Dispatch" icon={Ambulance} /></div></Cd>; }

/* ══════ DOCTOR PAGES ══════ */
function DDash({ onVisit }) { return <div className="space-y-6"><div className="grid grid-cols-3 gap-4"><Stat icon={Clock} label="Waiting" value="4" a="text-amber-600" /><Stat icon={Stethoscope} label="Seen today" value="6" a="text-emerald-600" /><Stat icon={ClipboardList} label="Prescriptions" value="4" a="text-sky-600" /></div><Cd><Hdr title="Token queue - Outpatient (Male)" /><TokenQ tokens={M.tokens.filter(t => t.date === "2026-01-09")} onStart={onVisit} /></Cd></div>; }
function DVisitForm({ pat, onBack, onRx }) { return <Cd className="max-w-2xl"><div className="flex items-center gap-2 mb-1"><button onClick={onBack}><ArrowLeft size={18} className="text-gray-400" /></button><h3 className="text-lg font-semibold text-gray-800">New consultation</h3></div><p className="text-sm text-gray-400 mb-5 ml-7">Patient: <span className="text-gray-700 font-medium">{pat}</span></p><div className="grid md:grid-cols-2 gap-4"><F label="Visit type" options={["NEW","FOLLOWUP","EMERGENCY"]} required dv="NEW" /><F label="Blood pressure" placeholder="120/80" /><F label="Temperature (F)" type="number" placeholder="98.6" /><F label="Weight (kg)" type="number" /><F label="Pulse" type="number" /><F label="Follow-up date" type="date" /><div className="md:col-span-2"><F label="Chief complaint" ta required placeholder="Describe symptoms..." /></div><div className="md:col-span-2"><F label="Diagnosis" ta placeholder="Clinical assessment..." /></div></div><div className="flex gap-3 mt-6"><Abtn label="Save and write prescription" color="emerald" icon={ClipboardList} onClick={onRx} /><button onClick={onBack} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600">Save only</button></div></Cd>; }
function DRxForm({ pat, onBack }) { return <Cd className="max-w-3xl"><div className="flex items-center gap-2 mb-5"><button onClick={onBack}><ArrowLeft size={18} className="text-gray-400" /></button><h3 className="text-lg font-semibold text-gray-800">Write prescription</h3><span className="text-sm text-gray-400 ml-2">- {pat}</span></div><div className="space-y-4 mb-6"><F label="Advice" ta placeholder="Plenty of fluids, rest..." /><F label="Next visit date" type="date" /></div><h4 className="text-sm font-semibold text-gray-700 mb-3">Prescription items</h4>{[{m:"Napa 500mg",d:"1+1+1",dy:5,q:15,ins:"After meal"},{m:"Histacin 4mg",d:"0+0+1",dy:5,q:5,ins:"At night"}].map((x,i) => <div key={i} className="grid grid-cols-6 gap-3 p-3 bg-gray-50 rounded-lg mb-2 items-end"><F label={i===0?"Medicine":""} options={M.meds.map(m => m.name+" "+m.str)} dv={x.m} /><F label={i===0?"Dosage":""} dv={x.d} /><F label={i===0?"Days":""} type="number" dv={x.dy} /><F label={i===0?"Qty":""} type="number" dv={x.q} /><F label={i===0?"Instruction":""} dv={x.ins} /><button className="p-2 text-red-400 hover:text-red-600"><X size={18} /></button></div>)}<button className="flex items-center gap-1 text-sm text-emerald-600 mt-2"><Plus size={16} />Add item</button><div className="flex gap-3 mt-6"><Abtn label="Save prescription" color="emerald" icon={Check} onClick={onBack} /></div></Cd>; }
function DVisits() { return <Cd><Hdr title="My visits" /><p className="text-xs text-gray-400 mb-3">Medical records cannot be deleted</p><Tbl cols={[{l:"Date",k:"date"},{l:"Patient",r:r => <span className="font-medium text-gray-800">{r.pat}</span>},{l:"Type",r:r => <B v={r.type.toLowerCase()}>{r.type}</B>},{l:"Complaint",r:r => <span className="text-gray-600 text-xs">{r.comp}</span>},{l:"Diagnosis",r:r => <span className="text-gray-700">{r.diag}</span>},{l:"BP",k:"bp"},{l:"",r:() => <button className="p-1.5 text-sky-500 hover:bg-sky-50 rounded"><Edit size={14} /></button>}]} rows={M.visits} /></Cd>; }
function DTests() { return <Cd><Hdr title="Test orders" action="Order test" icon={Plus} /><Tbl cols={[{l:"Date",k:"date"},{l:"Patient",r:r => <span className="font-medium text-gray-800">{r.pat}</span>},{l:"Test",k:"test"},{l:"Category",r:r => <B v={r.cat.toLowerCase()}>{r.cat}</B>},{l:"Status",r:r => <B v={r.st.toLowerCase()}>{r.st.replace("_"," ")}</B>},{l:"Result",r:r => <span className="text-gray-600 text-xs">{r.res || "-"}</span>}]} rows={M.tests} /></Cd>; }
function DAdmit() { return <div className="space-y-4"><Cd className="max-w-md"><Hdr title="Admit patient" /><div className="space-y-4"><F label="Patient" options={M.patients.map(p => p.name)} required /><F label="Disease" required placeholder="e.g. Chicken Pox, Mumps" /><p className="text-xs text-gray-400">Bed auto-assigned (first free isolation bed)</p><Abtn label="Admit" icon={BedDouble} color="emerald" /></div></Cd><Cd><Hdr title="Current beds" /><Tbl cols={[{l:"Bed",r:r => <span className="font-mono text-xs font-medium">{r.bed}</span>},{l:"Disease",k:"dis"},{l:"Patient",r:r => <span className={r.pat ? "font-medium text-gray-800" : "text-gray-300"}>{r.pat || "-"}</span>},{l:"Status",r:r => <B v={r.occ ? "occupied" : "free"}>{r.occ ? "Occupied" : "Free"}</B>},{l:"",r:r => r.occ ? <Abtn label="Discharge" color="amber" icon={Check} /> : null}]} rows={M.beds} /></Cd></div>; }

/* ══════ PHARMACIST PAGES ══════ */
function PDash() { return <div className="grid grid-cols-3 gap-4"><Stat icon={Pill} label="Medicines" value={M.meds.length} a="text-amber-600" /><Stat icon={AlertTriangle} label="Low stock" value={M.meds.filter(m => m.stk < m.ro).length} a="text-red-600" /><Stat icon={BarChart3} label="Revenue" value="BDT 394" a="text-emerald-600" /></div>; }
function PDisp() { return <Cd><Hdr title="Dispense queue" /><p className="text-sm text-gray-500 mb-4">Select a prescription to dispense</p>{M.rxs.map(rx => <div key={rx.id} className="p-4 rounded-lg border border-gray-100 bg-gray-50 mb-3"><div className="flex items-center justify-between mb-2"><div><span className="text-sm font-medium text-gray-800">{rx.pat}</span><span className="text-xs text-gray-400 ml-2">by {rx.doc} - {rx.date}</span></div><Abtn label="Dispense" color="amber" icon={Pill} /></div><div className="space-y-1">{rx.items.map((it,i) => <div key={i} className="flex gap-4 text-xs text-gray-600"><span className="font-medium w-32">{it.m}</span><span>{it.d}</span><span>{it.dy}d</span><span>Qty:{it.q}</span><span className="text-gray-400">{it.i}</span></div>)}</div></div>)}</Cd>; }
function PStock() { return <Cd><Hdr title="Medicine inventory" action="Add medicine" icon={Plus} /><Tbl cols={[{l:"Name",r:r => <span className="font-medium text-gray-800">{r.name}</span>},{l:"Generic",r:r => <span className="text-gray-500">{r.gen}</span>},{l:"Form",k:"form"},{l:"Str",k:"str"},{l:"Price",r:r => <span>{r.hom ? "Free" : "BDT "+r.price.toFixed(2)}</span>},{l:"Stock",r:r => <span className={r.stk < r.ro ? "text-red-600 font-semibold" : "text-gray-700"}>{r.stk}</span>},{l:"Reorder",k:"ro"},{l:"",r:r => r.stk < r.ro ? <B v="low">Low</B> : <B v="active">OK</B>},{l:"",r:() => <ED onEdit={() => {}} />}]} rows={M.meds} /></Cd>; }
function PLow() { const low = M.meds.filter(m => m.stk < m.ro); return <div className="space-y-4">{low.length > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-4"><div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-red-600" /><span className="text-sm font-semibold text-red-700">{low.length} items below reorder level</span></div>{low.map(m => <div key={m.id} className="flex justify-between py-2 border-b border-red-100 last:border-0"><div><span className="text-sm font-medium text-red-800">{m.name}</span><span className="text-xs text-red-500 ml-2">{m.gen} {m.str}</span></div><div className="text-right"><p className="text-sm text-red-700">Stock: {m.stk}</p><p className="text-xs text-red-400">Reorder: {m.ro}</p></div></div>)}</div>}<Cd><Hdr title="Dispense log" /><p className="text-xs text-gray-400 mb-3">Records are permanent</p><Tbl cols={[{l:"Date",k:"date"},{l:"Patient",r:r => <span className="font-medium text-gray-800">{r.pat}</span>},{l:"Category",r:r => <B v={r.cat.toLowerCase()}>{r.cat}</B>},{l:"Items",k:"items"},{l:"Charged",r:r => <span className={r.amt > 0 ? "text-gray-800 font-medium" : "text-emerald-600"}>{r.amt > 0 ? "BDT "+r.amt : "Free"}</span>},{l:"By",r:r => <span className="text-gray-500 text-xs">{r.by}</span>}]} rows={M.dispLog} /></Cd></div>; }

/* ══════ LAB PAGES ══════ */
function LDash() { return <div className="grid grid-cols-3 gap-4"><Stat icon={FlaskConical} label="Pending" value={M.tests.filter(t => t.st !== "COMPLETED").length} a="text-rose-600" /><Stat icon={Check} label="Completed" value={M.tests.filter(t => t.st === "COMPLETED").length} a="text-emerald-600" /><Stat icon={ClipboardList} label="Catalogue" value={M.catalogue.length} /></div>; }
function LPend() { return <Cd><Hdr title="Pending test orders" /><div className="space-y-3">{M.tests.filter(t => t.st !== "COMPLETED").map(t => <div key={t.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50"><div className="flex-1"><p className="text-sm font-medium text-gray-800">{t.pat}</p><p className="text-xs text-gray-400">{t.test} - {t.cat} - {t.date}</p><p className="text-xs text-gray-400">By: {t.doc}</p></div><div className="flex items-center gap-3"><B v={t.st.toLowerCase()}>{t.st.replace("_"," ")}</B><Abtn label="Enter result" color="rose" icon={FileText} /></div></div>)}</div></Cd>; }
function LRes() { return <Cd className="max-w-lg"><Hdr title="Enter test result" /><div className="p-3 bg-gray-50 rounded-lg mb-4"><p className="text-sm"><span className="font-medium">Patient:</span> Prof. Dr. Kamrul Hasan</p><p className="text-sm"><span className="font-medium">Test:</span> ECG</p><p className="text-xs text-gray-400">Ordered by Sharif Qamar Uddin - 2026-01-06</p></div><div className="space-y-4"><F label="Sample collected at" type="datetime-local" /><F label="Status" options={["SAMPLE_COLLECTED","COMPLETED"]} required /><F label="Result value" placeholder="Enter result..." /><F label="Result date" type="date" /><F label="Remarks" ta /><Abtn label="Save result" color="rose" icon={Check} /></div></Cd>; }
function LCat() { return <Cd><Hdr title="Diagnostic test catalogue" /><p className="text-xs text-gray-400 mb-3">Managed by Admin</p><Tbl cols={[{l:"Test",r:r => <span className="font-medium text-gray-800">{r.name}</span>},{l:"Category",r:r => <B v={r.cat.toLowerCase()}>{r.cat}</B>},{l:"Sample",r:r => <span className="text-gray-500">{r.sam || "-"}</span>},{l:"Normal range",r:r => <span className="text-xs text-gray-500">{r.range}</span>},{l:"Available",r:r => <span className="text-xs text-gray-500">{r.days}</span>}]} rows={M.catalogue} /></Cd>; }

/* ══════ PATIENT PAGES ══════ */
const ME = M.patients[0];
function PtDash() { return <div className="space-y-4"><Cd><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xl">{ME.name[0]}</div><div><h3 className="text-lg font-semibold text-gray-800">{ME.name}</h3><p className="text-sm text-gray-500">{ME.cat} - {ME.dept} - {ME.uid}</p></div><div className="ml-auto text-right"><B v="active">{ME.card} - ACTIVE</B><p className="text-xs text-gray-400 mt-1">Expires: {ME.exp}</p></div></div></Cd><div className="grid grid-cols-3 gap-4"><Stat icon={Stethoscope} label="Visits" value="1" /><Stat icon={ClipboardList} label="Prescriptions" value="1" a="text-emerald-600" /><Stat icon={FlaskConical} label="Tests" value="1" a="text-rose-600" /></div></div>; }
function PtVisits() { const my = M.visits.filter(v => v.pat === ME.name); return <Cd><Hdr title="My visit history" /><p className="text-xs text-gray-400 mb-3">Read-only</p>{my.map(v => <div key={v.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 mb-2"><div className="flex justify-between mb-2"><span className="text-sm font-medium">{v.date}</span><B v={v.type.toLowerCase()}>{v.type}</B></div><p className="text-sm text-gray-600"><span className="text-gray-400">Doctor:</span> {v.doc}</p><p className="text-sm text-gray-600"><span className="text-gray-400">Complaint:</span> {v.comp}</p><p className="text-sm text-gray-600"><span className="text-gray-400">Diagnosis:</span> {v.diag}</p><p className="text-xs text-gray-400 mt-1">BP: {v.bp} - Temp: {v.temp}F - Weight: {v.wt}kg - Pulse: {v.pulse}</p>{v.fu && <p className="text-xs text-sky-600 mt-1">Follow-up: {v.fu}</p>}</div>)}{my.length === 0 && <p className="text-sm text-gray-400">No visits.</p>}</Cd>; }
function PtRx() { const my = M.rxs.filter(r => r.pat === ME.name); return <Cd><Hdr title="My prescriptions" /><p className="text-xs text-gray-400 mb-3">Read-only</p>{my.map(rx => <div key={rx.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 mb-2"><div className="flex justify-between mb-2"><span className="text-sm font-medium">{rx.date}</span><span className="text-xs text-gray-400">{rx.doc}</span></div><p className="text-sm text-gray-500 italic mb-2">{rx.adv}</p>{rx.items.map((it,i) => <div key={i} className="flex gap-4 text-xs bg-white p-2 rounded mb-1"><span className="font-medium text-gray-700 w-28">{it.m}</span><span className="text-gray-500">{it.d} - {it.dy}d - Qty:{it.q}</span><span className="text-gray-400">{it.i}</span></div>)}</div>)}{my.length === 0 && <p className="text-sm text-gray-400">No prescriptions.</p>}</Cd>; }
function PtTests() { const my = M.tests.filter(t => t.pat === ME.name); return <Cd><Hdr title="My test results" /><p className="text-xs text-gray-400 mb-3">Read-only</p>{my.length > 0 ? my.map(t => <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 mb-2"><div><p className="text-sm font-medium text-gray-800">{t.test}</p><p className="text-xs text-gray-400">{t.date} - {t.cat}</p></div><div className="text-right"><B v={t.st.toLowerCase()}>{t.st.replace("_"," ")}</B>{t.res && <p className="text-xs text-gray-600 mt-1">{t.res}</p>}</div></div>) : <p className="text-sm text-gray-400">No results.</p>}</Cd>; }
function PtCard() { return <Cd className="max-w-md"><Hdr title="My health card" /><div className="p-5 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-200"><div className="flex justify-between mb-4"><span className="text-xs text-sky-600 font-medium">MORTUZA MEDICAL CENTRE</span><HeartPulse size={20} className="text-teal-600" /></div><p className="text-lg font-bold text-gray-800">{ME.name}</p><p className="text-sm text-gray-500">{ME.cat} - {ME.dept}</p><div className="mt-4 flex justify-between"><div><p className="text-xs text-gray-400">Card</p><p className="font-mono text-sm font-medium">{ME.card}</p></div><div className="text-right"><p className="text-xs text-gray-400">Expires</p><p className="text-sm font-medium">{ME.exp}</p></div></div><div className="mt-3 flex justify-end"><B v="active">ACTIVE</B></div></div><p className="text-xs text-gray-400 mt-3">Contact Receptionist to renew or report issues.</p></Cd>; }

/* ══════ NAV CONFIG ══════ */
const NAV = {
  ADMIN: [{k:"dash",l:"Dashboard",i:BarChart3},{k:"doctors",l:"Doctors",i:Stethoscope},{k:"roster",l:"Duty roster",i:Calendar},{k:"ambulance",l:"Ambulances",i:Ambulance},{k:"reports",l:"Reports",i:Activity}],
  RECEPTIONIST: [{k:"dash",l:"Dashboard",i:BarChart3},{k:"patients",l:"Patients",i:Users},{k:"cards",l:"Health cards",i:CreditCard},{k:"tokens",l:"Token queue",i:Hash},{k:"ambulance",l:"Ambulance",i:Ambulance}],
  DOCTOR: [{k:"dash",l:"Dashboard",i:BarChart3},{k:"queue",l:"Token queue",i:Clock},{k:"visits",l:"My visits",i:Stethoscope},{k:"tests",l:"Test orders",i:FlaskConical},{k:"admissions",l:"Admissions",i:BedDouble}],
  PHARMACIST: [{k:"dash",l:"Dashboard",i:BarChart3},{k:"dispense",l:"Dispense",i:ClipboardList},{k:"stock",l:"Stock",i:Pill},{k:"lowstock",l:"Low stock",i:AlertTriangle}],
  LAB_TECH: [{k:"dash",l:"Dashboard",i:BarChart3},{k:"pending",l:"Pending tests",i:Clock},{k:"results",l:"Enter results",i:FileText},{k:"catalogue",l:"Catalogue",i:FlaskConical}],
  PATIENT: [{k:"dash",l:"Overview",i:User},{k:"visits",l:"Visits",i:Stethoscope},{k:"rx",l:"Prescriptions",i:ClipboardList},{k:"tests",l:"Test results",i:FlaskConical},{k:"card",l:"Health card",i:CreditCard}],
};

/* ══════ LOGIN ══════ */
function Login({ onLogin }) {
  const [s, sS] = useState(null);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3"><HeartPulse size={32} className="text-teal-600" /><span className="text-2xl font-bold text-gray-900">MMCMS</span></div>
          <h1 className="text-xl font-semibold text-gray-800">Mortuza Medical Centre</h1>
          <p className="text-sm text-gray-500 mt-1">University of Dhaka - Management System</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <p className="text-sm font-medium text-gray-600 mb-4">Select a role to explore</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLES.map(r => (
              <button key={r.key} onClick={() => sS(r.key)} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${s === r.key ? "border-sky-500 bg-sky-50 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${r.color} text-white`}><r.icon size={18} /></div>
                <div><p className="text-sm font-medium text-gray-900">{r.label}</p><p className="text-xs text-gray-400">{r.user}</p></div>
              </button>
            ))}
          </div>
          <button onClick={() => s && onLogin(s)} disabled={!s} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white font-medium text-sm disabled:opacity-40 hover:opacity-90">
            Sign in as {s ? ROLES.find(r => r.key === s).label : "..."}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Prototype - mock data - no backend</p>
      </div>
    </div>
  );
}

/* ══════ MAIN SHELL ══════ */
function Dashboard({ role, onLogout }) {
  const [nav, setNav] = useState("dash");
  const [sub, setSub] = useState(null);
  const [side, setSide] = useState(true);
  const ri = ROLES.find(r => r.key === role);
  const ni = NAV[role] || [];
  const go = (k) => { setNav(k); setSub(null); };

  const page = () => {
    if (role === "DOCTOR" && sub === "visit") return <DVisitForm pat="Sabbir Kamrul" onBack={() => setSub(null)} onRx={() => setSub("rx")} />;
    if (role === "DOCTOR" && sub === "rx") return <DRxForm pat="Sabbir Kamrul" onBack={() => setSub(null)} />;

    const pages = {
      ADMIN: { dash: <ADash />, doctors: <ADocs />, roster: <ARoster />, ambulance: <AAmb />, reports: <ARep /> },
      RECEPTIONIST: { dash: <RDash go={go} />, patients: <RPat />, cards: <RCards />, tokens: <RTokens />, ambulance: <RAmb /> },
      DOCTOR: { dash: <DDash onVisit={() => setSub("visit")} />, queue: <Cd><Hdr title="Token queue - Outpatient (Male)" /><TokenQ tokens={M.tokens.filter(t => t.date === "2026-01-09")} onStart={() => setSub("visit")} /></Cd>, visits: <DVisits />, tests: <DTests />, admissions: <DAdmit /> },
      PHARMACIST: { dash: <div className="space-y-4"><PDash /><PDisp /></div>, dispense: <PDisp />, stock: <PStock />, lowstock: <PLow /> },
      LAB_TECH: { dash: <div className="space-y-4"><LDash /><LPend /></div>, pending: <LPend />, results: <LRes />, catalogue: <LCat /> },
      PATIENT: { dash: <PtDash />, visits: <PtVisits />, rx: <PtRx />, tests: <PtTests />, card: <PtCard /> },
    };
    return pages[role]?.[nav] || null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`${side ? "w-56" : "w-0 overflow-hidden"} bg-white border-r border-gray-100 flex-shrink-0 transition-all duration-200 relative`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2"><HeartPulse size={20} className="text-teal-600" /><span className="font-bold text-gray-900 text-sm">MMCMS</span></div>
          <p className="text-xs text-gray-400 mt-0.5">Mortuza Medical Centre</p>
        </div>
        <nav className="p-3 space-y-1">
          {ni.map(n => (
            <button key={n.k} onClick={() => go(n.k)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${nav === n.k ? "bg-sky-50 text-sky-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
              <n.i size={16} />{n.l}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-56 p-3 border-t border-gray-100">
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600"><LogOut size={16} />Sign out</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSide(!side)} className="text-gray-400 hover:text-gray-600"><Menu size={20} /></button>
            <h2 className="text-sm font-semibold text-gray-800">{ri.label} portal</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${ri.color} text-white`}><ri.icon size={14} /></div>
            <span className="text-sm text-gray-600">{ri.user}</span>
          </div>
        </header>
        <div className="flex-1 p-5 overflow-auto space-y-4">{page()}</div>
      </main>
    </div>
  );
}

export default function App() {
  const [r, sR] = useState(null);
  if (!r) return <Login onLogin={sR} />;
  return <Dashboard role={r} onLogout={() => sR(null)} />;
}
