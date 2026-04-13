function m(e){const s=new Date(`${e}T00:00:00`);return Number.isNaN(s.getTime())?e:new Intl.DateTimeFormat("es-GT",{day:"2-digit",month:"short",year:"numeric"}).format(s)}function o(e){return e==null||!Number.isFinite(Number(e))?"Sin datos":new Intl.NumberFormat("es-GT",{minimumFractionDigits:Number(e)%1===0?0:2,maximumFractionDigits:2}).format(Number(e))}function i(e){return e==null?"Sin datos":`${o(e)}%`}function a(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function c(e){return e.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9-_]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").toLowerCase()}function f(e){return e==="presente"?"Presente":e==="ausente"?"Ausente":e==="tarde"?"Tarde":e==="justificado"?"Justificado":"Sin registro"}function p(e,s){const r=new Blob([`\uFEFF${e}`],{type:"application/vnd.ms-excel;charset=utf-8"}),t=URL.createObjectURL(r),n=document.createElement("a");n.href=t,n.download=s,document.body.appendChild(n),n.click(),n.remove(),URL.revokeObjectURL(t)}function u(){return`
    body { font-family: Aptos, Calibri, Arial, sans-serif; color: #0f172a; }
    .sheet { padding: 24px; }
    .hero { background: linear-gradient(135deg, #2563eb, #06b6d4 55%, #020617); color: #fff; padding: 24px; border-radius: 18px; }
    .eyebrow { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #bfdbfe; font-weight: 800; }
    h1 { margin: 8px 0 0; font-size: 28px; }
    .subtitle { margin-top: 8px; color: #dbeafe; font-size: 14px; }
    .summary { margin-top: 20px; border-collapse: separate; border-spacing: 10px; width: 100%; }
    .summary td { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; font-weight: 800; }
    .summary .label { color: #64748b; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
    .summary .value { display: block; margin-top: 6px; font-size: 22px; color: #020617; }
    table.report { margin-top: 20px; width: 100%; border-collapse: collapse; }
    .report th { background: #0f172a; color: #fff; padding: 12px; text-align: left; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
    .report td { border-bottom: 1px solid #e2e8f0; padding: 12px; font-size: 13px; vertical-align: top; }
    .report tr:nth-child(even) td { background: #f8fafc; }
    .center { text-align: center; }
    .status { font-weight: 800; }
    .status-presente { color: #047857; }
    .status-ausente { color: #be123c; }
    .status-tarde { color: #b45309; }
    .status-justificado { color: #1d4ed8; }
    .status-sin-registro { color: #64748b; }
  `}function h(e){return e.reduce((s,r)=>{const t=r.asistencia?.estado??null;return t==="presente"?s.presente+=1:t==="ausente"?s.ausente+=1:t==="tarde"?s.tarde+=1:t==="justificado"?s.justificado+=1:s.sinRegistro+=1,s},{presente:0,ausente:0,tarde:0,justificado:0,sinRegistro:0})}function $(e){const s=h(e.items),r=e.items.map((n,l)=>{const b=`${n.estudiante.apellidos}, ${n.estudiante.nombres}`.trim(),d=n.asistencia?.estado??null;return`
        <tr>
          <td class="center">${l+1}</td>
          <td>${a(b)}</td>
          <td>${a(n.estudiante.correo)}</td>
          <td class="status status-${a(d??"sin-registro")}">${a(f(d))}</td>
          <td>${a(n.asistencia?.comentario||"Sin comentario")}</td>
        </tr>
      `}).join(""),t=`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${u()}</style>
      </head>
      <body>
        <div class="sheet">
          <div class="hero">
            <div class="eyebrow">C.FUTURO · Reporte de asistencia</div>
            <h1>${a(e.course.titulo)}</h1>
            <div class="subtitle">
              Fecha: ${a(m(e.date))} · Docente:
              ${a(`${e.course.docente.nombres} ${e.course.docente.apellidos}`.trim())}
            </div>
          </div>

          <table class="summary">
            <tr>
              <td><span class="label">Estudiantes</span><span class="value">${e.items.length}</span></td>
              <td><span class="label">Presentes</span><span class="value">${s.presente}</span></td>
              <td><span class="label">Tarde</span><span class="value">${s.tarde}</span></td>
              <td><span class="label">Justificados</span><span class="value">${s.justificado}</span></td>
              <td><span class="label">Ausentes</span><span class="value">${s.ausente}</span></td>
              <td><span class="label">Sin registro</span><span class="value">${s.sinRegistro}</span></td>
            </tr>
          </table>

          <table class="report">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Comentario</th>
              </tr>
            </thead>
            <tbody>${r}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;p(t,`reporte-asistencia-${c(e.course.titulo)}-${e.date}.xls`)}function g(e){const s=e.rows.map((t,n)=>{const l=`${t.estudiante.apellidos}, ${t.estudiante.nombres}`.trim();return`
        <tr>
          <td class="center">${n+1}</td>
          <td>${a(l)}</td>
          <td>${a(t.estudiante.correo)}</td>
          <td>${a(`${o(t.tareas.puntos_obtenidos)} / ${o(t.tareas.puntos_posibles)}`)}</td>
          <td>${a(`${o(t.quizzes.puntos_obtenidos)} / ${o(t.quizzes.puntos_posibles)}`)}</td>
          <td>${a(`${o(t.zona.puntos_obtenidos)} / ${o(t.zona.puntos_posibles)}`)}</td>
          <td>${a(i(t.zona.porcentaje))}</td>
        </tr>
      `}).join(""),r=`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${u()}</style>
      </head>
      <body>
        <div class="sheet">
          <div class="hero">
            <div class="eyebrow">C.FUTURO · Reporte de zona</div>
            <h1>${a(e.curso.titulo)}</h1>
            <div class="subtitle">
              Tareas + quizzes · Docente:
              ${a(`${e.curso.docente.nombres} ${e.curso.docente.apellidos}`.trim())}
            </div>
          </div>

          <table class="summary">
            <tr>
              <td><span class="label">Estudiantes</span><span class="value">${e.resumen.estudiantes}</span></td>
              <td><span class="label">Tareas</span><span class="value">${e.resumen.tareas_total}</span></td>
              <td><span class="label">Quizzes</span><span class="value">${e.resumen.quizzes_total}</span></td>
              <td><span class="label">Zona obtenida</span><span class="value">${o(e.resumen.zona_puntos_obtenidos)}</span></td>
              <td><span class="label">Zona posible</span><span class="value">${o(e.resumen.zona_puntos_posibles)}</span></td>
              <td><span class="label">Promedio</span><span class="value">${i(e.resumen.zona_promedio_porcentaje)}</span></td>
            </tr>
          </table>

          <table class="report">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>Correo</th>
                <th>Tareas</th>
                <th>Quizzes</th>
                <th>Zona</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>${s}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;p(r,`reporte-zona-${c(e.curso.titulo)}.xls`)}const x=Object.freeze(Object.defineProperty({__proto__:null,exportAttendanceExcel:$,exportZoneExcel:g},Symbol.toStringTag,{value:"Module"}));export{i as a,o as f,x as r};
