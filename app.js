const N = 4;
const ALPHA = 1;
const BETA = 1+2/N;
const GAMMA = 0.75 - 1/(2*N);
const DELTA = 1 - 1/N;
const NUM_MOVES = 75;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

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

function make_simplex(x0) {
    let simplex = [x0];
    for (let i = 0; i < N; i++) {
        let x = [...x0];
        x[i] *= 1.05;
        simplex.push(x);
    }
    simplex = simplex.map((e) => [f(e), e]);
    simplex.sort((a,b) => a[0]-b[0]);
    return simplex;
}

function get_moves(f, x0_init) {
    let best_score = 1;
    let best_moves = [];
    let best_x0 = [];

    for (let trial = 0; trial < 100; trial++) {
        let x0 = x0_init.map((e) => e + 0.01*(Math.random()*2-1));
        let simplex = make_simplex(x0);
        let moves = [];
        let prev_move = -1;
        let cur_streak = 0;
        let cur_move = -1;
        while (moves.length < NUM_MOVES) {
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
                //console.log(".R. reflect");
                cur_move = 1;
                simplex_replace(simplex, [fr, xr]);
            } else if (fr < f1) {
                let xe = vec_add(xc, scal_mul(BETA, vec_sub(xr, xc)));
                let fe = f(xe);
                if (fe < fr) {
                    //console.log("E.. expand");
                    cur_move = 0;
                    simplex_replace(simplex, [fe, xe]);
                } else {
                    //console.log(".R. reflect");
                    cur_move = 1;
                    simplex_replace(simplex, [fr, xr]);
                }
            } else if (fn <= fr && fr < fn1) {
                let xoc = vec_add(xc, scal_mul(GAMMA, vec_sub(xr, xc)));
                let foc = f(xoc);
                if (foc <= fr) {
                    //console.log("..C contract (outside)");
                    cur_move = 2;
                    simplex_replace(simplex, [foc, xoc]);
                } else {
                    //console.log("..C shrink");
                    cur_move = 2;
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
                    //console.log("..C contract (inside)")
                    cur_move = 2;
                    simplex_replace(simplex, [fic, xic]);
                } else {
                    //console.log("..C shrink");
                    cur_move = 2;
                    for (let i = 1; i < N+1; i++) {
                        let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)));
                        let fx = f(x);
                        simplex[i] = [fx,x];
                    }
                    simplex.sort((a,b) => a[0]-b[0]);
                }
            }
            if (cur_move != prev_move) {
                if (prev_move != -1) {
                    let num_split = Math.floor(Math.log(cur_streak)/Math.log(3))+1;
                    for (let i = 0; i < num_split-1; i++) {
                        let mult = Math.floor(cur_streak/(num_split-i)); // TODO: add jitter
                        moves.push([mult, prev_move]);
                        cur_streak -= mult;
                    }
                    moves.push([cur_streak, prev_move]);
                    cur_streak = 0;
                }
                prev_move = cur_move;
            }
            cur_streak++;
        }
        let counts = [0,0,0];
        for (let [_,x] of moves) {
            counts[x]++;
        }
        let score = (Math.max(...counts) - Math.min(...counts))/moves.length;
        if (score < best_score) {
            console.log(trial, score)
            best_x0 = x0;
            best_score = score;
            best_moves = moves;
        }
    }
    return [best_x0, best_moves];
}

function resize() {
    canvas.width = 800; //window.innerWidth;
    canvas.height = 600; //window.innerHeight;    
}

function render() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.rect(30, 50, 8, 500);
    ctx.rect(50, 50, 700, 500);
    ctx.strokeStyle = '#f23af2';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 2;
    ctx.stroke();
    window.requestAnimationFrame(render);
}

function main() {
    let [x0, moves] = get_moves(f, [-0.5,-1,-2,-2]);
    console.log(x0, moves);
    resize();
    window.requestAnimationFrame(render);
}

main();
