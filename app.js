const WIDTH_ORIG = 960;
const HEIGHT_ORIG = 720;
const N = 4;
const ALPHA = 1;
const BETA = 1 + 2 / N;
const GAMMA = 0.75 - 1 / (2 * N);
const DELTA = 1 - 1 / N;
const NUM_MOVES = 75;
let W = WIDTH_ORIG * devicePixelRatio;
let H = HEIGHT_ORIG * devicePixelRatio;

function balanced_ternary(x, precision) {
    var x = floor(x * pow(3, precision));
    let digits = [];
    while (x > 0) {
        let digit = [0, 1, -1][x % 3];
        digits.push(digit);
        x -= digit;
        x /= 3;
    }
    return digits;
}

function f(a) {
    let [x, y, z, w] = a;
    // McCormick + Styblinski-Tang: (-0.547, -1.547, -2.904, -2.904)
    return (Math.sin(x + y) + (x - y) ** 2 - 1.5 * x + 2.5 * y + 1) + ((z ** 4 - 16 * z ** 2 + 5 * z + w ** 4 - 16 * w ** 2 + 5 * w) / 2);
}

function vec_add(a, b) {
    return a.map((e, i) => e + b[i]);
}
function vec_sub(a, b) {
    return a.map((e, i) => e - b[i]);
}
function scal_mul(v, a) {
    return a.map((e) => v * e);
}

function simplex_replace(simplex, v) {
    simplex.pop()
    simplex.push(v);
    simplex.sort((a, b) => a[0] - b[0]);
}

function make_simplex(x0) {
    let simplex = [x0];
    for (let i = 0; i < N; i++) {
        let x = [...x0];
        x[i] *= 1.05;
        simplex.push(x);
    }
    simplex = simplex.map((e) => [f(e), e]);
    simplex.sort((a, b) => a[0] - b[0]);
    return simplex;
}

function get_moves(f, x0_init) {
    let best_score = 1;
    let best_moves = [];
    let best_x0 = [];

    for (let trial = 0; trial < 100; trial++) {
        let x0 = x0_init.map((e) => e + 0.01 * (Math.random() * 2 - 1));
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
            xc = scal_mul(1 / N, xc);
            let [f1, x1] = simplex[0];
            let [fn, xn] = simplex[N - 1];
            let [fn1, xn1] = simplex[N];
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
                    for (let i = 1; i < N + 1; i++) {
                        let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)));
                        let fx = f(x);
                        simplex[i] = [fx, x];
                    }
                    simplex.sort((a, b) => a[0] - b[0]);
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
                    for (let i = 1; i < N + 1; i++) {
                        let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)));
                        let fx = f(x);
                        simplex[i] = [fx, x];
                    }
                    simplex.sort((a, b) => a[0] - b[0]);
                }
            }
            if (cur_move != prev_move) {
                if (prev_move != -1) {
                    let num_split = Math.floor(Math.log(cur_streak) / Math.log(3)) + 1;
                    for (let i = 0; i < num_split - 1; i++) {
                        let mult = Math.floor(cur_streak / (num_split - i)); // TODO: add jitter
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
        let counts = [0, 0, 0];
        for (let [_, x] of moves) {
            counts[x]++;
        }
        let score = (Math.max(...counts) - Math.min(...counts)) / moves.length;
        if (score < best_score) {
            //console.log(trial, score);
            best_x0 = x0;
            best_score = score;
            best_moves = moves;
        }
    }
    return [best_x0, best_moves];
}

class Play extends Phaser.Scene {
    preload() {
        this.load.plugin('rexroundrectangleplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/8b4ad8083e48019f39b37d8f629379851ca8ec13/dist/rexroundrectangleplugin.min.js', true);
    }

    create() {
        this.cameras.main.setBackgroundColor("#111111");
        this.graphics = this.add.graphics();
        this.add.rectangle(50 - 0.5, 100 - 0.5, 300, H - 200).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.rectangle(50 - 0.5, 5 - 0.5, 300, 100 - 5).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.rectangle(150 - 0.5, 100 - 0.5, 100, H - 200).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0);
        this.add.text(15, H - 100, 'INTENSITY', { font: '12pt Covenant', fill: '#f23af2' }).setAngle(-90);
        this.add.rectangle(35 - 0.5, 100 - 0.5, 8, H - 200).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.rectangle(357 - 0.5, 600 - 0.5, 8, H - 700).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.text(370, 10, 'OBJECTIVE FUNCTION', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(370, 80, 'TRANSFORMS', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(370, 150, 'POLYTOPE', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(W - 200, 150, 'ALGORITHM', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(400, H - 110, 'SCORE', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(100, H - 85, 'EXPAND', { font: '12pt Covenant', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(200, H - 85, 'REFLECT', { font: '12pt Covenant', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(300, H - 85, 'CONTRACT', { font: '12pt Covenant', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(100, H - 65, 'Z', { font: '72pt Thaleah', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(200, H - 65, 'X', { font: '72pt Thaleah', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(300, H - 65, 'C', { font: '72pt Thaleah', fill: '#f23af2' }).setOrigin(0.5);
        let expand_receptor = this.add.container(100 - 0.5, H - 140 - 0.5);
        expand_receptor.add(this.add.rexRoundRectangle(0, 0, 100 - 2 * 5, 70, 10).setStrokeStyle(2, 0xf23af2, 0.75));
        expand_receptor.add(this.add.polygon(0, 0, [[5, 8], [20, 8], [20, 15], [40, 0], [20, -15], [20, -8], [5, -8]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        expand_receptor.add(this.add.polygon(0, 0, [[-5, -8], [-20, -8], [-20, -15], [-40, -0], [-20, 15], [-20, 8], [-5, 8]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        let reflect_receptor = this.add.container(200 - 0.5, H - 140 - 0.5);
        reflect_receptor.add(this.add.rexRoundRectangle(0, 0, 100 - 2 * 5, 70, 10).setStrokeStyle(2, 0xf23af2, 0.75));
        reflect_receptor.add(this.add.line(0, 0, 0, 25, 0, -25).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        reflect_receptor.add(this.add.triangle(0, 0, 7, 0, 35, 18, 35, -18).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        reflect_receptor.add(this.add.triangle(0, 0, -7, 0, -35, 18, -35, -18).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        let contract_receptor = this.add.container(300 - 0.5, H - 140 - 0.5);
        contract_receptor.add(this.add.rexRoundRectangle(0, 0, 100 - 2 * 5, 70, 10).setStrokeStyle(2, 0xf23af2, 0.75));
        contract_receptor.add(this.add.polygon(0, 0, [[-40 + 2, -8], [-25 + 2, -8], [-25 + 2, -15], [-5 + 2, -0], [-25 + 2, 15], [-25 + 2, 8], [-40 + 2, 8]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        contract_receptor.add(this.add.polygon(0, 0, [[40 - 2, 8], [25 - 2, 8], [25 - 2, 15], [5 - 2, 0], [25 - 2, -15], [25 - 2, -8], [40 - 2, -8]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        this.receptors = [expand_receptor, reflect_receptor, contract_receptor];

        for (let receptor of this.receptors) {
            receptor.setScale(0.9);
            this.tweens.add({
                targets: receptor,
                scale: 1,
                loop: -1,
                duration: 500,
                ease: 'Sine.easeOut',
            });
        }

        this.tmp = this.add.text(500, 500, 'test');
        let [x0, moves] = get_moves(f, [-0.5, -1, -2, -2]);
        this.moves = moves;
        this.x0 = x0;
        //console.log(this.x0, this.moves);
    }

    update() {
        this.graphics.clear();
        //this.graphics.lineStyle(1, 0xf23af2, 0.75);
        let debug = [];
        debug = debug.concat(this.x0);
        for (let i = 0; i < 10; i++) {
            let x = this.moves[i][1];
            debug.push(`${'ZXC'[this.moves[i][1]]} ${this.moves[i][0]}`);
            this.graphics.fillStyle([0xdd0000, 0x00dd00, 0x0000dd][x]);
            this.graphics.fillRoundedRect(55 - 0.5 + 100 * x, H - 175 - 0.5 - i * 90, 90, 70, 10);
        }
        this.tmp.setText(debug);
    }
}

async function add_font(name, url) {
    const font = new FontFace(name, url);
    await font.load();
    document.fonts.add(font);
}

async function main() {
    await add_font('Covenant', 'url(Covenant5x5.ttf)');
    await add_font('Thaleah', 'url(ThaleahFat.ttf)');

    const config = {
        type: Phaser.AUTO,
        width: W,
        height: H,
        zoom: 1 / window.devicePixelRatio,
        scene: Play,
        /*scale: {
            autoCenter: Phaser.Scale.CENTER_BOTH
        }*/
    };
    const game = new Phaser.Game(config);
}

main();