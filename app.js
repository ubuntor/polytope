const N = 4;
const ALPHA = 1;
const BETA = 1+2/N;
const GAMMA = 0.75 - 1/(2*N);
const DELTA = 1 - 1/N;

function f(a) {
    let [x,y,z,w] = a;
    // McCormick + Styblinski-Tang: (-0.547, -1.547, -2.904, -2.904)
    return (Math.sin(x+y) + (x-y)**2 - 1.5*x + 2.5*y + 1) + ((z**4 - 16*z**2 + 5*z + w**4 - 16*w**2 + 5*w)/2);
}

function vec_add(a,b) {
    return a.map((e,i) => e+b[i]);
}
function vec_sub(a,b) {
    return a.map((e,i) => e-b[i]);
}
function scal_mul(v,a) {
    return a.map((e) => v*e);
}

function simplex_replace(simplex, v) {
    simplex.pop()
    simplex.push(v);
    simplex.sort((a,b) => a[0]-b[0]);
}

function get_moves(f, x0_init) {
    let x0 = x0_init.map((e) => e + 0.01*(Math.random()*2-1));
    let simplex = [x0];
    for (let i = 0; i < N; i++) {
        let x = [...x0];
        x[i] *= 1.05;
        simplex.push(x);
    }
    console.log(simplex);
    simplex = simplex.map((e) => [f(e), e]);
    simplex.sort((a,b) => a[0]-b[0]);
    console.log(simplex);
    let moves = [];
    while (moves.length < 50 || Math.abs(simplex[0][0] - simplex[N][0]) > 0.00001) {
        let xc = Array(N).fill(0);
        for (let i = 0; i < N; i++) {
            xc = vec_add(xc, simplex[i][1]);
        }
        xc = scal_mul(1/N, xc);
        let [f1,x1] = simplex[0];
        let [fn,xn] = simplex[N-1];
        let [fn1,xn1] = simplex[N];
        let xr = vec_add(xc, scal_mul(ALPHA, vec_sub(xc, xn1)));
        let fr = f(xr);
        if (f1 <= fr && fr < fn) {
            console.log("R.. reflect");
            moves.push(0);
            simplex_replace(simplex, [fr, xr]);
        } else if (fr < f1) {
            let xe = vec_add(xc, scal_mul(BETA, vec_sub(xr, xc)));
            let fe = f(xe);
            if (fe < fr) {
                console.log(".E. expand");
                moves.push(1);
                simplex_replace(simplex, [fe, xe]);
            } else {
                console.log("R.. reflect");
                moves.push(0);
                simplex_replace(simplex, [fr, xr]);
            }
        } else if (fn <= fr && fr < fn1) {
            let xoc = vec_add(xc, scal_mul(GAMMA, vec_sub(xr, xc)));
            let foc = f(xoc);
            if (foc <= fr) {
                console.log("..C contract (outside)");
                moves.push(2);
                simplex_replace(simplex, [foc, xoc]);
            } else {
                console.log("..C shrink");
                moves.push(2);
                for (let i = 1; i < N+1; i++) {
                    let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)));
                    let fx = f(x);
                    simplex[i] = [fx,x];
                }
                simplex.sort((a,b) => a[0]-b[0]);
            }
        } else { // fr >= fn1
            xic = vec_sub(xc, scal_mul(GAMMA, vec_sub(xr, xc)))
            fic = f(xic)
            if (fic < fn1) {
                console.log("..C contract (inside)")
                moves.push(2);
                simplex_replace(simplex, [fic, xic]);
            } else {
                console.log("..C shrink");
                moves.push(2);
                for (let i = 1; i < N+1; i++) {
                    let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)));
                    let fx = f(x);
                    simplex[i] = [fx,x];
                }
                simplex.sort((a,b) => a[0]-b[0]);
            }
        }
    }
    console.log(simplex);
}

const canvas = document.getElementById('canvas');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;    
}

function main() {
    console.log(get_moves(f, [-0.5,-1,-2,-2]));
    resize();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

main();
