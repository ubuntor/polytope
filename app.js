const WIDTH_ORIG = 960;
const HEIGHT_ORIG = 720;
const N = 4;
const ALPHA = 1;
const BETA = 1 + 2 / N;
const GAMMA = 0.75 - 1 / (2 * N);
const DELTA = 1 - 1 / N;
const VISIBLE_MOVES = 10;
const NUM_RANDOM = 1000;
let W = WIDTH_ORIG * devicePixelRatio;
let H = HEIGHT_ORIG * devicePixelRatio;
let RAND = [];

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

function f(a, t, id) {
    let [x, y, z, w] = a;
    // McCormick + Styblinski-Tang: (-0.547, -1.547, -2.904, -2.904)
    return (0.0001 * RAND[(t * (2 * N + 5) + id) % RAND.length]) + (Math.sin(x + y) + (x - y) ** 2 - 1.5 * x + 2.5 * y + 1) + ((z ** 4 - 16 * z ** 2 + 5 * z + w ** 4 - 16 * w ** 2 + 5 * w) / 2);
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
    let id = simplex.pop()[2];
    v.push(id);
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
    simplex = simplex.map((e, i) => [f(e, 0, i), e, i]);
    simplex.sort((a, b) => a[0] - b[0]);
    return simplex;
}

function next_move(f, t, simplex_orig) {
    let cur_streak = 0;
    let cur_move = -1;
    let simplex = JSON.parse(JSON.stringify(simplex_orig)); // lmao deep copy
    for (let i = 0; i < 81; i++) {
        t++;
        simplex = simplex.map(([_, e, id]) => [f(e, t, id), e, id]);
        simplex.sort((a, b) => a[0] - b[0]);

        let xc = Array(N).fill(0);
        for (let i = 0; i < N; i++) {
            xc = vec_add(xc, simplex[i][1]);
        }
        xc = scal_mul(1 / N, xc);
        let [f1, x1] = simplex[0];
        let [fn, xn] = simplex[N - 1];
        let [fn1, xn1] = simplex[N];
        let xr = vec_add(xc, scal_mul(ALPHA, vec_sub(xc, xn1)));
        let fr = f(xr, t, N + 1);
        if (f1 <= fr && fr < fn) {
            //console.log(".R. reflect");
            if (cur_move == -1) {
                cur_move = 1;
            } else if (cur_move != 1) {
                break;
            }
            simplex_replace(simplex, [fr, xr]);
        } else if (fr < f1) {
            let xe = vec_add(xc, scal_mul(BETA, vec_sub(xr, xc)));
            let fe = f(xe, t, N + 2);
            if (fe < fr) {
                //console.log("E.. expand");
                if (cur_move == -1) {
                    cur_move = 0;
                } else if (cur_move != 0) {
                    break;
                }
                simplex_replace(simplex, [fe, xe]);
            } else {
                //console.log(".R. reflect (failed expand)");
                if (cur_move == -1) {
                    cur_move = 1;
                } else if (cur_move != 1) {
                    break;
                }
                simplex_replace(simplex, [fr, xr]);
            }
        } else if (fn <= fr && fr < fn1) {
            let xoc = vec_add(xc, scal_mul(GAMMA, vec_sub(xr, xc)));
            let foc = f(xoc, t, N + 3);
            if (foc <= fr) {
                //console.log("..C contract (outside)");
                if (cur_move == -1) {
                    cur_move = 2;
                } else if (cur_move != 2) {
                    break;
                }
                simplex_replace(simplex, [foc, xoc]);
            } else {
                //console.log("..C shrink (failed outside contract)");
                if (cur_move == -1) {
                    cur_move = 3;
                } else if (cur_move != 3) {
                    break;
                }
                for (let i = 1; i < N + 1; i++) {
                    let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)));
                    let fx = f(x, t, N + 4 + i);
                    simplex[i] = [fx, x, simplex[i][2]];
                }
                simplex.sort((a, b) => a[0] - b[0]);
            }
        } else { // fr >= fn1
            xic = vec_sub(xc, scal_mul(GAMMA, vec_sub(xr, xc)))
            fic = f(xic, t, N + 4)
            if (fic < fn1) {
                //console.log("..C contract (inside)")
                if (cur_move == -1) {
                    cur_move = 2;
                } else if (cur_move != 2) {
                    break;
                }
                simplex_replace(simplex, [fic, xic]);
            } else {
                //console.log("..C shrink (failed inside contract)");
                if (cur_move == -1) {
                    cur_move = 3;
                } else if (cur_move != 3) {
                    break;
                }
                for (let i = 1; i < N + 1; i++) {
                    let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][1], x1)));
                    let fx = f(x, t, N + 4 + i);
                    simplex[i] = [fx, x, simplex[i][2]];
                }
                simplex.sort((a, b) => a[0] - b[0]);
            }
        }
        cur_streak++;
    }
    return [[cur_streak, cur_move], simplex, t - 1];
}

function init_moves(f, x0_init) {
    let best_score = 1;
    let best_moves = [];

    for (let trial = 0; trial < 100; trial++) {
        let x0 = x0_init.map((e) => e + 0.01 * (Math.random() * 2 - 1));
        let orig_simplex = make_simplex(x0);
        let simplex = orig_simplex;
        let t = 0;
        let moves = [];
        while (moves.length < 500) {
            let total_mult, move;
            // TODO: WRONG need in-between simplex
            [[total_mult, move], simplex, t] = next_move(f, t, simplex);
            //console.log(total_mult, move, t, simplex);
            let num_split = Math.floor(Math.log(total_mult) / Math.log(3)) + 1;
            // deemphasize reflect
            if (move == 1 && num_split > 1) {
                num_split--;
            }
            for (let i = 0; i < num_split - 1; i++) {
                let mult = Math.floor(total_mult / (num_split - i)); // TODO: add jitter
                moves.push([mult, move, simplex]);
                total_mult -= mult;
            }
            moves.push([total_mult, move, simplex]);
        }
        let counts = [0, 0, 0, 0];
        for (let i = 0; i < moves.length; i++) {
            counts[moves[i][1]]++;
        }
        //let score = (Math.max(...counts) - Math.min(...counts)) / moves.length;
        let score = (counts[1] - counts[0] - counts[3]) / moves.length; // REFLECT - EXPAND - SHRINK
        if (score < best_score) {
            console.log(trial, score, counts);
            best_score = score;
            best_moves = moves;
        }
    }
    console.log(best_moves);
    return best_moves;
}

class Play extends Phaser.Scene {
    preload() {
        this.load.plugin('rexroundrectangleplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/8b4ad8083e48019f39b37d8f629379851ca8ec13/dist/rexroundrectangleplugin.min.js', true);
    }

    process_move(x) {
        if (x == this.moves[0][1]) {
            console.log('good');
            this.moves.shift();
        } else {
            console.log('bad');
        }
    }

    create() {
        RAND = Array.from({ length: NUM_RANDOM }, _ => Math.random() * 2 - 1);
        this.cameras.main.setBackgroundColor("#111111");
        this.graphics = this.add.graphics();
        this.add.rectangle(50 - 0.5, 100 - 0.5, 320, H - 200).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.rectangle(50 - 0.5, 5 - 0.5, 320, 100 - 5).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.line(0, 0, 50 + 80 - 0.5, 100 - 0.5, 50 + 80 - 0.5, H - 100 - 0.5).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0, 0);
        this.add.line(0, 0, 50 + 2 * 80 - 0.5, 100 - 0.5, 50 + 2 * 80 - 0.5, H - 100 - 0.5).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0, 0);
        this.add.line(0, 0, 50 + 3 * 80 - 0.5, 100 - 0.5, 50 + 3 * 80 - 0.5, H - 100 - 0.5).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0, 0);


        //this.add.rectangle(150 - 0.5, 100 - 0.5, 100, H - 200).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0);
        this.add.text(15, H - 100, 'INTENSITY', { font: '12pt Covenant', fill: '#f23af2' }).setAngle(-90);
        this.add.rectangle(35 - 0.5, 100 - 0.5, 8, H - 200).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.rectangle(377 - 0.5, 600 - 0.5, 8, H - 700).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.text(390, 10, 'OBJECTIVE FUNCTION', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(390, 80, 'TRANSFORMS', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(390, 150, 'POLYTOPE', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(W - 200, 150, 'ALGORITHM', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(420, H - 110, 'SCORE', { font: '12pt Covenant', fill: '#f23af2' });
        this.add.text(90, H - 88, 'EXPAND', { font: '24pt m3x6', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(170, H - 88, 'REFLECT', { font: '24pt m3x6', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(250, H - 88, 'CONTRACT', { font: '24pt m3x6', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(330, H - 88, 'SHRINK', { font: '24pt m3x6', fill: '#f23af2' }).setOrigin(0.5);

        this.add.text(90 + 2, H - 65, 'Z', { font: '72pt Thaleah', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(170 + 2, H - 65, 'X', { font: '72pt Thaleah', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(250 + 2, H - 65, 'C', { font: '72pt Thaleah', fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(330 + 2, H - 65, 'V', { font: '72pt Thaleah', fill: '#f23af2' }).setOrigin(0.5);

        let expand_receptor = this.add.container(90 - 0.5, H - 140 - 0.5);
        expand_receptor.add(this.add.rexRoundRectangle(0, 0, 80 - 2 * 5, 70, 10).setStrokeStyle(2, 0xf23af2, 0.75));
        expand_receptor.add(this.add.polygon(0, 0, [[5, 8], [15, 8], [15, 15], [30, 0], [15, -15], [15, -8], [5, -8]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        expand_receptor.add(this.add.polygon(0, 0, [[-5, -8], [-15, -8], [-15, -15], [-30, -0], [-15, 15], [-15, 8], [-5, 8]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        let reflect_receptor = this.add.container(170 - 0.5, H - 140 - 0.5);
        reflect_receptor.add(this.add.rexRoundRectangle(0, 0, 80 - 2 * 5, 70, 10).setStrokeStyle(2, 0xf23af2, 0.75));
        reflect_receptor.add(this.add.line(0, 0, 0, 20, 0, -20).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        reflect_receptor.add(this.add.triangle(0, 0, 7, 0, 25, 12, 25, -12).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        reflect_receptor.add(this.add.triangle(0, 0, -7, 0, -25, 12, -25, -12).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        let contract_receptor = this.add.container(250 - 0.5, H - 140 - 0.5);
        contract_receptor.add(this.add.rexRoundRectangle(0, 0, 80 - 2 * 5, 70, 10).setStrokeStyle(2, 0xf23af2, 0.75));
        contract_receptor.add(this.add.polygon(0, 0, [[-30 + 2, -8], [-20 + 2, -8], [-20 + 2, -15], [-5 + 2, -0], [-20 + 2, 15], [-20 + 2, 8], [-30 + 2, 8]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        contract_receptor.add(this.add.polygon(0, 0, [[30 - 2, 8], [20 - 2, 8], [20 - 2, 15], [5 - 2, 0], [20 - 2, -15], [20 - 2, -8], [30 - 2, -8]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        let shrink_receptor = this.add.container(330 - 0.5, H - 140 - 0.5);
        shrink_receptor.add(this.add.rexRoundRectangle(0, 0, 80 - 2 * 5, 70, 10).setStrokeStyle(2, 0xf23af2, 0.75));
        for (let [xm, ym] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
            shrink_receptor.add(this.add.polygon(0, 0, [[3 * xm, 3 * ym], [20 * xm, 3 * ym], [14 * xm, 8 * ym], [26 * xm, 20 * ym], [20 * xm, 26 * ym], [8 * xm, 14 * ym], [3 * xm, 20 * ym]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        }

        this.receptors = [expand_receptor, reflect_receptor, contract_receptor, shrink_receptor];

        /*for (let receptor of this.receptors) {
            receptor.setScale(0.9);
            this.tweens.add({
                targets: receptor,
                scale: 1,
                loop: -1,
                duration: 500,
                ease: 'Sine.easeOut',
            });
        }
        this.cameras.main.zoom = 1.01;
        this.tweens.add({
            targets: this.cameras.main,
            zoom: 1,
            loop: -1,
            duration: 500,
            ease: 'Sine.easeOut',
        });*/

        this.tmp = this.add.text(500, 500, 'test');
        this.moves = init_moves(f, [-0.5, -1, -2, -2]);
        let keycodes = [Phaser.Input.Keyboard.KeyCodes.Z, Phaser.Input.Keyboard.KeyCodes.X, Phaser.Input.Keyboard.KeyCodes.C, Phaser.Input.Keyboard.KeyCodes.V];
        for (let i = 0; i < keycodes.length; i++) {
            this.input.keyboard.addKey(keycodes[i]).on('down', function (key, event) {
                this.process_move(i);
            }, this);
        }
    }

    update() {
        this.graphics.clear();
        let debug = [this.moves.length];
        for (let i = 0; i < 10; i++) {
            let x = this.moves[i][1];
            debug.push(`${'ZXCV'[this.moves[i][1]]} ${this.moves[i][0]}`);
            this.graphics.fillStyle([0xdd0000, 0x00dd00, 0x00dddd, 0x0000dd][x]);
            this.graphics.fillRoundedRect(55 - 0.5 + 80 * x, H - 175 - 0.5 - i * 90, 70, 70, 10);
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
    await add_font('m3x6', 'url(m3x6.ttf)');

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