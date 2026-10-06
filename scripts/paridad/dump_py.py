"""Volcado de informes y reglas de ContaWinPy (Python) para comparar con la versión web."""
import sys, os, json, shutil
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))  # carpeta ContaWinPy
from contawin import reports, util
from contawin.db import Database, ErrorDatos
src, dst, out = sys.argv[1], sys.argv[2], sys.argv[3]
shutil.copy(src, dst)
db = Database(dst)
R = {}
def inf2(i):
    return dict(titulo=i.titulo, columnas=[[c.titulo,c.ancho,c.formato,c.alineacion,c.vacio_si_cero] for c in i.columnas],
      filas=[[f.valores,f.estilo,f.texto, i.textos(f) if f.estilo!='grupo' else []] for f in i.filas],
      subtitulos=i.subtitulos, membrete=i.membrete, cab=i.datos_cabecera, pie=i.pie, firmas=i.firmas,
      horizontal=i.horizontal, tp=i.totales_pagina, nombre=i.nombre_archivo)
E='2026-10-05'
for e in db.empresas():
    eid=e['id']
    R[f'list_c_{eid}']=inf2(reports.listado_cuentas(db,eid)); R[f'list_cc_{eid}']=inf2(reports.listado_ccostos(db,eid)); R[f'list_p_{eid}']=inf2(reports.listado_proveedores(db,eid))
    R[f'sug_{eid}']=db.cuenta_resultado_sugerida(eid)
    for p in db.periodos(eid):
        pid=p['id']; a=p['ano']; d,h=f'{a}-01-01',f'{a}-12-31'
        R[f'rango_{pid}']=[str(x) if x else None for x in db.rango_fechas(pid)]
        R[f'rangoc_{pid}']=[str(x) if x else None for x in db.rango_fechas_compras(pid)]
        R[f'diario_{pid}']=inf2(reports.libro_diario(db,eid,pid,d,h,emision=E))
        for t in 'IET': R[f'diario_{t}_{pid}']=inf2(reports.libro_diario(db,eid,pid,d,h,tipo=t,emision=E))
        R[f'mayor_{pid}']=inf2(reports.libro_mayor(db,eid,pid,f'{a}-03-01',h,emision=E))
        R[f'mayor2_{pid}']=inf2(reports.libro_mayor(db,eid,pid,d,h,'110000','299999',emision=E))
        R[f'b8_{pid}']=inf2(reports.balance_8_columnas(db,eid,pid,d,h,emision=E))
        R[f'b8m_{pid}']=inf2(reports.balance_8_columnas(db,eid,pid,f'{a}-02-01',f'{a}-06-30',emision=E))
        R[f'bti_{pid}']=inf2(reports.balance_tipo_informe(db,eid,pid,f'{a}-07-31',emision=E))
        R[f'lc_{pid}']=inf2(reports.libro_compras(db,eid,pid,d,h,emision=E))
        for cc in [c['codigo'] for c in db.ccostos(eid)]+['']:
            R[f'lc_{pid}_{cc}']=inf2(reports.libro_compras(db,eid,pid,d,h,cc,emision=E))
        R[f'sc_{pid}']=db.saldos_cierre(pid)
        R[f'desc_{pid}']=db.cantidad_descuadrados(pid)
        for x in db.asientos(pid,'tipo'):
            R[f'comp_{x["id"]}']=inf2(reports.comprobante(db,eid,x['id'],emision=E))
            R[f'det_{x["id"]}']=db.detalle_asiento(x['id'])
        try: R[f'la_{pid}']=db.lineas_apertura(pid, R[f'sug_{eid}'])
        except ErrorDatos as ex: R[f'la_{pid}']=str(ex)
R['list_e']=inf2(reports.listado_empresas(db))
R['login']=[bool(db.login(u,c)) for u,c in [('admin','admin'),('cac','cac'),('conta','conta'),('admin','x')]]
R['usuarios']=[dict(u) for u in db.usuarios()]
# util
vals=['76.127.217-9','96792430K','76127217-8','1','k','12.345.678-5','','abc','10.411.341-9','1-9','0-0']
R['rut']=[[util.validar_rut(v),util.formato_rut(v),util.formato_rut_simple(v),util.limpiar_rut(v)] for v in vals]
R['mon']=[[util.fmt_monto(v),util.fmt_monto(v,True),util.fmt_pesos(v)] for v in [0,1,-1500,1234567,2.5,3.5,-2.5,999999999999,'12','x',None]]
R['parse']=[util.parse_monto(v) for v in ['1.234.567','-1.500','12,5','12,6','',' - ','abc','1e3','2,5','3,5', 7.5]]
R['fechas']=[[util.to_iso(v),str(util.from_iso(v)) if util.from_iso(v) else None,util.fmt_fecha(v),util.fecha_texto(v)] for v in ['20170103','2017-01-03','3/1/2017','03/01/2017','2023-02-30','2024-02-29','', 'x']]
R['cod']=[[util.formato_codigo(v),util.limpiar_codigo(v)] for v in ['100001','10','1000011','10.00.01','ab-cd.ef.gh','']]
R['iva']=[ (t, int(round(t/(1+util.TASA_IVA)))) for t in [119000,1000,1,2,3,59,595,1190,100,250,9999,123457]]
json.dump(R, open(out,'w'), ensure_ascii=False, sort_keys=True, default=str, indent=0)
