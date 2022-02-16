const WIDTH_ORIG = 960;
const HEIGHT_ORIG = 720;
const N = 4;
const ALPHA = 1;
const BETA = 1 + 2 / N;
const GAMMA = 0.75 - 1 / (2 * N);
const DELTA = 1 - 1 / N;
const VISIBLE_MOVES = 8;
let W = WIDTH_ORIG * devicePixelRatio;
let H = HEIGHT_ORIG * devicePixelRatio;
const TRIALS = 100;
const WIKIPEDIA = `The Nelder-Mead method (also downhill simplex method, amoeba method, or polytope method) is a commonly applied numerical method used to find the minimum or maximum of an objective function in a multidimensional space. It is a direct search method (based on function comparison) and is often applied to nonlinear optimization problems for which derivatives may not be known. However, the Nelder-Mead technique is a heuristic search method that can converge to non-stationary points on problems that can be solved by alternative methods.

The Nelder-Mead technique was proposed by John Nelder and Roger Mead in 1965, as a development of the method of Spendley et al.

The method uses the concept of a simplex, which is a special polytope of n+1 vertices in n dimensions. Examples of simplices include a line segment on a line, a triangle on a plane, a tetrahedron in three-dimensional space and so forth.

The method approximates a local optimum of a problem with n variables when the objective function varies smoothly and is unimodal. Typical implementations minimize functions, and we maximize f(x) by minimizing -f(x).

For example, a suspension bridge engineer has to choose how thick each strut, cable, and pier must be. These elements are interdependent, but it is not easy to visualize the impact of changing any specific element. Simulation of such complicated structures is often extremely computationally expensive to run, possibly taking upwards of hours per execution. The Nelder-Mead method requires, in the original variant, no more than two evaluations per iteration, except for the shrink operation described later, which is attractive compared to some other direct-search optimization methods. However, the overall number of iterations to proposed optimum may be high.

Nelder-Mead in n dimensions maintains a set of n+1 test points arranged as a simplex. It then extrapolates the behavior of the objective function measured at each test point in order to find a new test point and to replace one of the old test points with the new one, and so the technique progresses. The simplest approach is to replace the worst point with a point reflected through the centroid of the remaining n points. If this point is better than the best current point, then we can try stretching exponentially out along this line. On the other hand, if this new point isn't much better than the previous value, then we are stepping across a valley, so we shrink the simplex towards a better point. An intuitive explanation of the algorithm from "Numerical Recipes":

The downhill simplex method now takes a series of steps, most steps just moving the point of the simplex where the function is largest ("highest point") through the opposite face of the simplex to a lower point. These steps are called reflections, and they are constructed to conserve the volume of the simplex (and hence maintain its nondegeneracy). When it can do so, the method expands the simplex in one or another direction to take larger steps. When it reaches a "valley floor", the method contracts itself in the transverse direction and tries to ooze down the valley. If there is a situation where the simplex is trying to "pass through the eye of a needle", it contracts itself in all directions, pulling itself in around its lowest (best) point.

Unlike modern optimization methods, the Nelder-Mead heuristic can converge to a non-stationary point, unless the problem satisfies stronger conditions than are necessary for modern methods. Modern improvements over the Nelder-Mead heuristic have been known since 1979.

Many variations exist depending on the actual nature of the problem being solved. A common variant uses a constant-size, small simplex that roughly follows the gradient direction (which gives steepest descent). Visualize a small triangle on an elevation map flip-flopping its way down a valley to a local bottom. This method is also known as the flexible polyhedron method. This, however, tends to perform poorly against the method described in this article because it makes small, unnecessary steps in areas of little interest.`

function balanced_ternary(x, precision) {
    var x = Math.floor(x * Math.pow(3, precision));
    let digits = [];
    while (x > 0) {
        let digit = [0, 1, -1][x % 3];
        digits.push(digit);
        x -= digit;
        x /= 3;
    }
    if (digits.length == 0) {
        return [0];
    }
    digits.reverse();
    return digits;
}

function f(a) {
    let [x, y, z, w] = a;
    // McCormick + Styblinski-Tang: (-0.547, -1.547, -2.904, -2.904)
    return (0.0001 * (Math.random() * 2 - 1)) + (Math.sin(x + y) + (x - y) ** 2 - 1.5 * x + 2.5 * y + 1) + ((z ** 4 - 16 * z ** 2 + 5 * z + w ** 4 - 16 * w ** 2 + 5 * w) / 2);
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
    let xn1 = [...simplex[simplex.length - 1]];
    xn1[0] = v;
    simplex[simplex.length - 1] = xn1;
}

function make_simplex(x0) {
    let simplex = [x0];
    for (let i = 0; i < N; i++) {
        let x = [...x0];
        x[i] *= 1.05;
        simplex.push(x);
    }
    simplex = simplex.map((e, i) => [e, i]);
    return simplex;
}

function next_state(f, simplex_orig) {
    let move;
    let simplex = [...simplex_orig];
    let f_simplex = Array(N + 1);
    for (let i = 0; i < N + 1; i++) {
        f_simplex[simplex[i][1]] = f(simplex[i][0])
    }
    simplex.sort((a, b) => f_simplex[a[1]] - f_simplex[b[1]]);
    let xc = Array(N).fill(0);
    for (let i = 0; i < N; i++) {
        xc = vec_add(xc, simplex[i][0]);
    }
    xc = scal_mul(1 / N, xc);
    let [x1, id1] = simplex[0];
    let f1 = f_simplex[id1];
    let [xn, idn] = simplex[N - 1];
    let fn = f_simplex[idn];
    let [xn1, idn1] = simplex[N];
    let fn1 = f_simplex[idn1];
    let xr = vec_add(xc, scal_mul(ALPHA, vec_sub(xc, xn1)));
    let fr = f(xr);
    let xe = vec_add(xc, scal_mul(BETA, vec_sub(xr, xc)));
    let fe = f(xe);
    let xoc = vec_add(xc, scal_mul(GAMMA, vec_sub(xr, xc)));
    let foc = f(xoc);
    let xic = vec_sub(xc, scal_mul(GAMMA, vec_sub(xr, xc)))
    let fic = f(xic)
    if (f1 <= fr && fr < fn) {
        //console.log(".R.. reflect");
        move = 1;
        simplex_replace(simplex, xr);
    } else if (fr < f1) {
        if (fe < fr) {
            //console.log("E... expand");
            move = 0;
            simplex_replace(simplex, xe);
        } else {
            //console.log(".R.. reflect (failed expand)");
            move = 1;
            simplex_replace(simplex, xr);
        }
    } else if (fn <= fr && fr < fn1) {
        if (foc <= fr) {
            //console.log("..C. contract (outside)");
            move = 2;
            simplex_replace(simplex, xoc);
        } else {
            //console.log("...S shrink (failed outside contract)");
            move = 3;
            for (let i = 1; i < N + 1; i++) {
                let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][0], x1)));
                simplex[i] = [x, simplex[i][1]];
            }
        }
    } else { // fr >= fn1
        if (fic < fn1) {
            //console.log("..C. contract (inside)")
            move = 2;
            simplex_replace(simplex, xic);
        } else {
            //console.log("...S shrink (failed inside contract)");
            move = 3;
            for (let i = 1; i < N + 1; i++) {
                let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][0], x1)));
                simplex[i] = [x, simplex[i][1]];
            }
        }
    }
    let state = {
        simplex: simplex_orig,
        move,
        f_simplex,
        fr,
        fe,
        foc,
        fic
    }

    return [state, simplex];
}

function* next_states(f, simplex) {
    let state;
    [state, simplex] = next_state(f, simplex);
    let states = [state];
    let total_mult = 1;
    while (true) {
        [state, simplex] = next_state(f, simplex);
        if (state.move != states[0].move || total_mult >= 81) {
            let num_split = Math.floor(Math.log(total_mult) / Math.log(3)) + 1;
            // deemphasize reflect
            if (states[0].move == 1 && num_split > 1) {
                num_split--;
            }
            let mults = [];
            for (let i = 0; i < num_split - 1; i++) {
                let mult = Math.floor(total_mult / 3);
                mults.push(mult);
                total_mult -= mult;
            }
            mults.push(total_mult);
            mults.sort();
            let cur_index = 0;
            let moves = [];
            for (let i = 0; i < num_split; i++) {
                states[cur_index].mult = mults[i];
                moves.push(states[cur_index]);
                cur_index += mults[i];
            }
            yield moves;
            states = [];
            total_mult = 0;
        }
        states.push(state);
        total_mult++;
    }
}

/*
state : {
    simplex (before move)
    move
    mult
    f_simplex
    fr
    fe
    foc
    fic
}
*/

function init_moves(f, x0_init) {
    let best_score = 1;
    let best_moves = [];

    for (let trial = 0; trial < TRIALS; trial++) {
        let x0 = x0_init.map((e) => e + 0.01 * (Math.random() * 2 - 1));
        let simplex = make_simplex(x0);
        let moves = [];
        let gen = next_states(f, simplex);
        while (moves.length < 500) {
            moves = moves.concat(gen.next().value);
        }
        let counts = [0, 0, 0, 0];
        for (let i = 0; i < moves.length; i++) {
            counts[moves[i].move]++;
        }
        //let score = (Math.max(...counts) - Math.min(...counts)) / moves.length;
        let score = (counts[1] - (counts[0] + counts[3])) / moves.length; // REFLECT - (EXPAND+SHRINK)
        if (score < best_score) {
            console.log(trial, score, counts);
            best_score = score;
            best_moves = moves;
            best_gen = gen;
        }
    }
    console.log(best_moves);
    return [best_moves, best_gen];
}

class Play extends Phaser.Scene {
    preload() {
        this.load.plugin('rexroundrectangleplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/8b4ad8083e48019f39b37d8f629379851ca8ec13/dist/rexroundrectangleplugin.min.js', true);
    }

    process_move(x) {
        if (x == this.moves[0].move) {
            console.log('good');
            this.moves.shift();
            if (this.moves.length < VISIBLE_MOVES) {
                this.moves = this.moves.concat(this.gen.next().value);
            }
        } else {
            console.log('bad');
        }
    }

    create() {
        this.cameras.main.setBackgroundColor("#111111");
        this.graphics = this.add.graphics();
        this.add.rectangle(50 - 0.5, 100 - 0.5, 320, H - 200).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.line(0, 0, 50 + 80 - 0.5, 100 - 0.5, 50 + 80 - 0.5, H - 100 - 0.5).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0, 0);
        this.add.line(0, 0, 50 + 2 * 80 - 0.5, 100 - 0.5, 50 + 2 * 80 - 0.5, H - 100 - 0.5).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0, 0);
        this.add.line(0, 0, 50 + 3 * 80 - 0.5, 100 - 0.5, 50 + 3 * 80 - 0.5, H - 100 - 0.5).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0, 0);
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

        this.add.rectangle(50 - 0.5, 5 - 0.5, 320, 100 - 5).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        let mask_shape = this.make.graphics();
        mask_shape.fillStyle(0xffffff);
        mask_shape.beginPath();
        mask_shape.fillRect(50 - 0.5 + 1, 5 - 0.5 + 1, 320 - 2, 100 - 5 - 2);
        let mask = mask_shape.createGeometryMask();
        this.wikipedia = this.make.text({
            x: 55, y: -5, text: WIKIPEDIA, style: { font: '24pt m3x6', fill: 'white', lineSpacing: -15, wordWrap: { width: 320 } }
        })
        this.wikipedia_y = 0;
        this.wikipedia.setMask(mask);
        console.log(this.wikipedia)
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
        [this.moves, this.gen] = init_moves(f, [-0.5, -1, -2, -2]);
        let keycodes = [Phaser.Input.Keyboard.KeyCodes.Z, Phaser.Input.Keyboard.KeyCodes.X, Phaser.Input.Keyboard.KeyCodes.C, Phaser.Input.Keyboard.KeyCodes.V];
        for (let i = 0; i < keycodes.length; i++) {
            this.input.keyboard.addKey(keycodes[i]).on('down', function (key, event) {
                this.process_move(i);
            }, this);
        }
    }

    update(time, delta) {
        this.graphics.clear();
        //console.log(this.moves);
        let debug = [this.moves.length];
        this.graphics.lineStyle(3, 0xdddd00);
        for (let i = 0; i < VISIBLE_MOVES; i++) {
            let m = this.moves[i].move;
            debug.push(`${'ZXCV'[m]} ${this.moves[i].mult}`);
            this.graphics.fillStyle([0xdd0000, 0x00dd00, 0x00dddd, 0x0000dd][m]);
            let x = 90 + 80 * m - 0.5;
            let y = H - 140 - i * 90 - 0.5;
            this.graphics.fillRoundedRect(x - 35, y - 35, 70, 70, 10);
            if (this.moves[i].mult > 1) {
                this.graphics.lineBetween(x - 30, y, x + 30, y);
                let digits = balanced_ternary(this.moves[i].mult, 0);
                let start = -7.5 * (digits.length - 1);
                for (let j = 0; j < digits.length; j++) {
                    switch (digits[j]) {
                        case -1:
                            this.graphics.lineBetween(x + start + 15 * j, y, x + start + 15 * j, y + 20);
                            break;
                        case 0:
                            this.graphics.strokeCircle(x + start + 15 * j, y, 5);
                            break;
                        case 1:
                            this.graphics.lineBetween(x + start + 15 * j, y, x + start + 15 * j, y - 20);
                            break;
                    }
                }
            }
        }
        this.wikipedia_y = (this.wikipedia_y - delta * 0.01) % (this.wikipedia.height + 100);
        this.wikipedia.y = this.wikipedia_y - 5 + 95;
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