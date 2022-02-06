import math
import random
import itertools

def f(a):
    x,y,z,w = a
    # McCormick + Styblinski-Tang: (-0.547, -1.547, -2.904, -2.904)
    return ((math.sin(x+y) + (x-y)**2 - 1.5*x + 2.5*y + 1) + ((z**4 - 16*z**2 + 5*z + w**4 - 16*w**2 + 5*w)/2))

N = 4

while True:
    x0 = [-0.5, -0.5, -0.5, -0.5]

    for i in range(N):
        x0[i] += 0.01*(random.random()*2-1)

    x0 = tuple(x0)
    print(x0)

    simplex = [x0]
    for i in range(N):
        l = list(x0)
        l[i] *= 1.05
        simplex.append(tuple(l))

    simplex = [(f(x), x) for x in simplex]
    simplex = sorted(simplex)
    print(simplex)

    def vec_add(a,b):
        return tuple(x+y for x,y in zip(a,b))
    def vec_sub(a,b):
        return tuple(x-y for x,y in zip(a,b))
    def scal_mul(n,a):
        return tuple(n*x for x in a)

    ADAPTIVE = False
    if ADAPTIVE:
        ALPHA = 1
        BETA = 1+2/N
        GAMMA = 0.75 - 1/(2*N)
        DELTA = 1 - 1/N
    else:
        ALPHA = 1
        BETA = 2
        GAMMA = 0.5
        DELTA = 0.5

    num_moves = 0

    l = []

    while num_moves < 50 or abs(simplex[0][0] - simplex[-1][0]) > 0.000001:
        num_moves += 1
        xc = tuple(sum(x[1][i] for x in simplex[:N])/N for i in range(N))
        f1, x1 = simplex[0]
        #print([x[0] for x in simplex])
        #print(simplex, xc)
        fn, xn = simplex[-2]
        fn1, xn1 = simplex[-1]

        xr = vec_add(xc, scal_mul(ALPHA, vec_sub(xc, xn1)))
        fr = f(xr)
        if f1 <= fr < fn:
            print("R.. reflect")
            l.append(0)
            simplex = sorted(simplex[:N] + [(fr, xr)])
            continue
        elif fr < f1:
            xe = vec_add(xc, scal_mul(BETA, vec_sub(xr, xc)))
            fe = f(xe)
            if fe < fr:
                print(".E. expand")
                l.append(1)
                simplex = sorted(simplex[:N] + [(fe, xe)])
                continue
            else:
                print("R.. reflect")
                l.append(0)
                simplex = sorted(simplex[:N] + [(fr, xr)])
                continue
        elif fn <= fr < fn1:
            xoc = vec_add(xc, scal_mul(GAMMA, vec_sub(xr, xc)))
            foc = f(xoc)
            if foc <= fr:
                print("..C contract (outside)")
                l.append(2)
                simplex = sorted(simplex[:N] + [(foc, xoc)])
                continue
            else:
                print("..C shrink")
                l.append(2)
                s = simplex[:1]
                for i in range(1,N+1):
                    x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)))
                    fx = f(x)
                    s.append((fx,x))
                simplex = sorted(s)
        else: # fr >= fn1
            xic = vec_sub(xc, scal_mul(GAMMA, vec_sub(xr, xc)))
            fic = f(xic)
            if fic < fn1:
                print("..C contract (inside)")
                l.append(2)
                simplex = sorted(simplex[:N] + [(fic, xic)])
                continue
            else:
                print("..C shrink")
                l.append(2)
                s = simplex[:1]
                for i in range(1,N+1):
                    x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)))
                    fx = f(x)
                    s.append((fx,x))
                simplex = sorted(s)

    for x, group in itertools.groupby(l):
        for i in range(math.floor(math.log(len(list(group)), 3))+1):
            print(["R..",".E.","..C"][x])
    break
