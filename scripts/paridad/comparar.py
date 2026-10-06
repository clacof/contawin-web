import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
def norm(x):
    if isinstance(x,float) and x.is_integer(): return int(x)
    if isinstance(x,list): return [norm(i) for i in x]
    if isinstance(x,dict): return {k:norm(v) for k,v in x.items()}
    return x
a,b=norm(a),norm(b)
malas=0
for k in sorted(set(a)|set(b)):
    if a.get(k)!=b.get(k):
        malas+=1
        if malas<=8: print('DIF',k,'\n PY',json.dumps(a.get(k),ensure_ascii=False)[:600],'\n TS',json.dumps(b.get(k),ensure_ascii=False)[:600])
print(f'{len(a)} claves comparadas, {malas} diferencias')
