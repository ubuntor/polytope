import * as THREE from 'https://cdn.skypack.dev/three@0.137.5';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';

const N = 4;
const ALPHA = 1;
const BETA = 1 + 2 / N;
const GAMMA = 0.75 - 1 / (2 * N);
const DELTA = 1 - 1 / N;
const VISIBLE_MOVES = 8;
const R = devicePixelRatio;
const W = 960 * R;
const H = 720 * R;
const R2 = R / 1.25;
const FS = Math.round(R); // font scale
const F = (x) => Math.floor(x * R2);
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

const loader = new GLTFLoader();
const gltf = await new Promise((resolve, reject) => loader.load('tet.glb', data => resolve(data), null, reject));
const cos = Math.cos;
const sin = Math.sin;

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
function vec_nudge(a) {
    return a.map((e) => e + (0.000001 * (Math.random() * 2 - 1)));
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
        simplex[i][0] = vec_nudge(simplex[i][0]);
        f_simplex[simplex[i][1]] = f(simplex[i][0]);
    }
    simplex.sort((a, b) => f_simplex[a[1]] - f_simplex[b[1]]);
    let xc = Array(N).fill(0);
    for (let i = 0; i < N; i++) {
        xc = vec_add(xc, simplex[i][0]);
    }
    xc = scal_mul(1 / N, xc);
    let changed = Array(N + 1).fill(false);
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
        changed[idn1] = true;
    } else if (fr < f1) {
        if (fe < fr) {
            //console.log("E... expand");
            move = 0;
            simplex_replace(simplex, xe);
            changed[idn1] = true;
        } else {
            //console.log(".R.. reflect (failed expand)");
            move = 1;
            simplex_replace(simplex, xr);
            changed[idn1] = true;
        }
    } else if (fn <= fr && fr < fn1) {
        if (foc <= fr) {
            //console.log("..C. contract (outside)");
            move = 2;
            simplex_replace(simplex, xoc);
            changed[idn1] = true;
        } else {
            //console.log("...S shrink (failed outside contract)");
            move = 3;
            for (let i = 1; i < N + 1; i++) {
                let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][0], x1)));
                simplex[i] = [x, simplex[i][1]];
                changed[simplex[i][1]] = true;
            }
        }
    } else { // fr >= fn1
        if (fic < fn1) {
            //console.log("..C. contract (inside)")
            move = 2;
            simplex_replace(simplex, xic);
            changed[idn1] = true;
        } else {
            //console.log("...S shrink (failed inside contract)");
            move = 3;
            for (let i = 1; i < N + 1; i++) {
                let x = vec_add(x1, scal_mul(DELTA, vec_sub(simplex[i][0], x1)));
                simplex[i] = [x, simplex[i][1]];
                changed[simplex[i][1]] = true;
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
        fic,
        changed
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

                let changed = Array(N + 1).fill(false);
                for (let j = cur_index; j < cur_index + mults[i]; j++) {
                    changed = changed.map((e, i) => e || states[j].changed[i]);
                }
                states[cur_index].mult = mults[i];
                states[cur_index].changed = changed;
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
    let best_gen;

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
    //console.log(best_moves);
    return [best_moves, best_gen];
}

function v_smooth(src, target, delta) {
    src.set(src.x + (target.x - src.x) * delta,
        src.y + (target.y - src.y) * delta,
        src.z + (target.z - src.z) * delta);
}

function s_smooth(src, target, delta) {
    src.setScalar(src.x + (target - src.x) * delta);
}

class Play extends Phaser.Scene {
    async preload() {
        this.load.plugin('rexroundrectangleplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/8b4ad8083e48019f39b37d8f629379851ca8ec13/dist/rexroundrectangleplugin.min.js', true);
    }

    process_move(x) {
        // TODO: freestyle
        if (x == this.moves[0].move) {
            console.log('good');
            for (let i = 0; i < N + 1; i++) {
                if (this.moves[0].changed[i]) {
                    this.three.vertex_mats[i].color.setHex(0xf23af2);
                }
            }
            this.moves.shift();
            if (this.moves.length < VISIBLE_MOVES) {
                this.moves = this.moves.concat(this.gen.next().value);
            }

            if (!this.climax) {
                this.intensity += 0.01;
                if (this.intensity > 1) {
                    this.climax = true;
                    this.intensity = 1;
                }
            }
        } else {
            console.log('bad');

            if (!this.climax) {
                this.intensity = Math.max(this.intensity - 0.02, 0);
            }
        }
    }

    create() {
        this.cameras.main.setBackgroundColor("#111111");
        this.add.rectangle(F(50) - 0.5, F(100) - 0.5, F(320), H - F(200)).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        for (let i = 1; i <= 3; i++) {
            this.add.line(0, 0, F(50 + 80 * i) - 0.5, F(100) - 0.5, F(50 + 80 * i) - 0.5, H - F(100) - 0.5).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0, 0);
        }
        this.add.text(F(385), H - F(98), 'POTENTIAL', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' }).setOrigin(1, 1).setAngle(90);
        this.add.rectangle(F(377) - 0.5, F(600) - 0.5, F(8), H - F(700)).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        this.add.text(F(390), F(10), 'OBJECTIVE FUNCTION', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.add.text(F(390), F(80), 'TRANSFORMS', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.add.text(W - F(200), F(150), 'ALGORITHM', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.add.text(F(420), H - F(110), 'SCORE', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.add.text(F(90), H - F(88), 'EXPAND', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(F(170), H - F(88), 'REFLECT', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(F(250), H - F(88), 'CONTRACT', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(F(330), H - F(88), 'SHRINK', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5);

        this.add.text(F(90 + 2), H - F(65), 'Z', { font: `${72 * FS}pt Thaleah`, fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(F(170 + 2), H - F(65), 'X', { font: `${72 * FS}pt Thaleah`, fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(F(250 + 2), H - F(65), 'C', { font: `${72 * FS}pt Thaleah`, fill: '#f23af2' }).setOrigin(0.5);
        this.add.text(F(330 + 2), H - F(65), 'V', { font: `${72 * FS}pt Thaleah`, fill: '#f23af2' }).setOrigin(0.5).setResolution(1.25);

        let expand_receptor = this.add.container(F(90) - 0.5, H - F(140) - 0.5);
        expand_receptor.add(this.add.rexRoundRectangle(0, 0, F(80 - 2 * 5), F(70), F(10)).setStrokeStyle(2, 0xf23af2, 0.75));
        expand_receptor.add(this.add.polygon(0, 0, [[5 * R2, 8 * R2], [15 * R2, 8 * R2], [15 * R2, 15 * R2], [30 * R2, 0], [15 * R2, -15 * R2], [15 * R2, -8 * R2], [5 * R2, -8 * R2]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        expand_receptor.add(this.add.polygon(0, 0, [[-5 * R2, -8 * R2], [-15 * R2, -8 * R2], [-15 * R2, -15 * R2], [-30 * R2, -0], [-15 * R2, 15 * R2], [-15 * R2, 8 * R2], [-5 * R2, 8 * R2]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        let reflect_receptor = this.add.container(F(170) - 0.5, H - F(140) - 0.5);
        reflect_receptor.add(this.add.rexRoundRectangle(0, 0, F(80 - 2 * 5), F(70), F(10)).setStrokeStyle(2, 0xf23af2, 0.75));
        reflect_receptor.add(this.add.line(0, 0, 0, 20 * R2, 0, -20 * R2).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        reflect_receptor.add(this.add.triangle(0, 0, 7 * R2, 0, 25 * R2, 12 * R2, 25 * R2, -12 * R2).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        reflect_receptor.add(this.add.triangle(0, 0, -7 * R2, 0, -25 * R2, 12 * R2, -25 * R2, -12 * R2).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        let contract_receptor = this.add.container(F(250) - 0.5, H - F(140) - 0.5);
        contract_receptor.add(this.add.rexRoundRectangle(0, 0, F(80 - 2 * 5), F(70), F(10)).setStrokeStyle(2, 0xf23af2, 0.75));
        contract_receptor.add(this.add.polygon(0, 0, [[(-30 + 2) * R2, -8 * R2], [(-20 + 2) * R2, -8 * R2], [(-20 + 2) * R2, -15 * R2], [(-5 + 2) * R2, -0], [(-20 + 2) * R2, 15 * R2], [(-20 + 2) * R2, 8 * R2], [(-30 + 2) * R2, 8 * R2]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        contract_receptor.add(this.add.polygon(0, 0, [[(30 - 2) * R2, 8 * R2], [(20 - 2) * R2, 8 * R2], [(20 - 2) * R2, 15 * R2], [(5 - 2) * R2, 0], [(20 - 2) * R2, -15 * R2], [(20 - 2) * R2, -8 * R2], [(30 - 2) * R2, -8 * R2]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));

        let shrink_receptor = this.add.container(F(330) - 0.5, H - F(140) - 0.5);
        shrink_receptor.add(this.add.rexRoundRectangle(0, 0, F(80 - 2 * 5), F(70), F(10)).setStrokeStyle(2, 0xf23af2, 0.75));
        for (let [xm, ym] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
            xm *= R2;
            ym *= R2;
            shrink_receptor.add(this.add.polygon(0, 0, [[3 * xm, 3 * ym], [20 * xm, 3 * ym], [14 * xm, 8 * ym], [26 * xm, 20 * ym], [20 * xm, 26 * ym], [8 * xm, 14 * ym], [3 * xm, 20 * ym]]).setStrokeStyle(2, 0xf23af2, 0.75).setOrigin(0, 0));
        }

        this.receptors = [expand_receptor, reflect_receptor, contract_receptor, shrink_receptor];

        this.add.rectangle(F(50) - 0.5, F(5) - 0.5, F(320), F(95)).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        let mask_shape = this.make.graphics();
        mask_shape.fillStyle(0xffffff);
        mask_shape.beginPath();
        mask_shape.fillRect(F(50) - 0.5 + 1, F(5) - 0.5 + 1, F(320) - 2, F(95) - 2);
        let mask = mask_shape.createGeometryMask();
        this.wikipedia = this.make.text({
            x: F(55), y: F(-5), text: WIKIPEDIA, style: { font: `${24 * FS}pt m3x6`, fill: 'white', lineSpacing: R2 * -15, wordWrap: { width: F(320) } }
        })
        this.wikipedia_y = 0;
        this.wikipedia.setMask(mask);
        //console.log(this.wikipedia)
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

        this.tmp = this.add.text(F(1000), F(500), 'test');
        [this.moves, this.gen] = init_moves(f, [-0.5, -1, -2, -2]);
        let keycodes = [Phaser.Input.Keyboard.KeyCodes.Z, Phaser.Input.Keyboard.KeyCodes.X, Phaser.Input.Keyboard.KeyCodes.C, Phaser.Input.Keyboard.KeyCodes.V];
        for (let i = 0; i < keycodes.length; i++) {
            this.input.keyboard.addKey(keycodes[i]).on('down', function (key, event) {
                this.process_move(i);
            }, this);
        }

        this.add.text(F(35), H - F(100), 'INTENSITY', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' }).setOrigin(0, 1).setAngle(-90);
        this.intensity = 0;
        this.add.rectangle(F(35), F(100), F(9), H - F(200), 0xf23af2).setOrigin(0);
        this.intensity_mask = this.add.rectangle(F(35) + 1, F(100) + 1, F(9) - 2, H - F(200) - 2, 0x000000).setOrigin(0);
        this.polytope_canvas = document.createElement('canvas');
        document.body.appendChild(this.polytope_canvas);
        this.polytope_canvas.style.position = "absolute";
        this.polytope_canvas.style.top = `150px`;
        this.polytope_canvas.style.left = `312px`;
        this.polytope_canvas.width = 480;
        this.polytope_canvas.height = 480;


        this.add.text(F(390), F(180), 'POLYTOPE', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.three = {};
        this.three.renderer = new THREE.WebGLRenderer({ alpha: true, canvas: this.polytope_canvas });
        this.three.renderer.setSize(this.polytope_canvas.width, this.polytope_canvas.height);
        this.three.scene = new THREE.Scene();
        this.three.camera = new THREE.PerspectiveCamera(60, this.polytope_canvas.width / this.polytope_canvas.height, 0.1, 1000);
        const light = new THREE.AmbientLight(0x808080);
        this.three.scene.add(light);
        const light1 = new THREE.PointLight(0xffffff, 1, 0);
        light1.position.set(0, 200, 0);
        this.three.scene.add(light1);

        const light2 = new THREE.PointLight(0xffffff, 1, 0);
        light2.position.set(100, 200, 100);
        this.three.scene.add(light2);

        const light3 = new THREE.PointLight(0xffffff, 1, 0);
        light3.position.set(- 100, - 200, - 100);
        this.three.scene.add(light3);
        this.three.camera.position.z = 5;

        this.three.vertices = [];
        this.three.vertex_mats = [];
        this.three.vertex_color = new THREE.Color(0x333333);
        this.three.vertex_group = new THREE.Group();
        this.three.scene.add(this.three.vertex_group);
        let sphere_geom = new THREE.SphereGeometry(0.05, 32, 16);
        for (let i = 0; i < N + 1; i++) {
            let material = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 100 });
            let vertex = new THREE.Mesh(sphere_geom, material);
            this.three.vertices.push(vertex);
            this.three.vertex_mats.push(material);
            this.three.vertex_group.add(vertex);
        }
        this.three.camera_pos = new THREE.Vector3();
        this.three.bounding_box = new THREE.Box3();
        this.three.bounding_center = new THREE.Vector3();
        this.three.bounding_sphere = new THREE.Sphere(this.three.bounding_center);
        this.three.sphere_debug_geom = new THREE.SphereGeometry(1, 16, 8);
        this.three.sphere_debug = new THREE.LineSegments(this.three.sphere_debug_geom, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.2 }));
        this.three.scene.add(this.three.sphere_debug);

        this.three.line_geom = new THREE.CylinderGeometry(0.01, 0.01, 1);
        this.three.line_geom.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
        this.three.line_geom.applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
        this.three.line_material = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 100 });
        this.three.lines = [];
        this.three.line_vecs = [];
        for (let i = 0; i < N + 1; i++) {
            for (let j = i + 1; j < N + 1; j++) {
                let line = new THREE.Mesh(this.three.line_geom, this.three.line_material);
                this.three.lines[i * (N + 1) + j] = line;
                this.three.line_vecs[i * (N + 1) + j] = new THREE.Vector3();
                this.three.scene.add(line);
            }
        }

        this.three.tets = [];
        this.three.tet_p = [];
        let tet_geom = gltf.scene.children[0].geometry;
        tet_geom.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, -1));

        let tet_material = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.5 });
        //new THREE.MeshPhongMaterial({ color: 0x0000ff });

        for (let i = 0; i < N + 1; i++) {
            let tet = new THREE.Mesh(tet_geom, tet_material);
            tet.matrixAutoUpdate = false;
            this.three.tets.push(tet);
            this.three.scene.add(tet);
            this.three.tet_p.push(new THREE.Vector4());
        }

        this.three.r_zw = 0;
        this.three.r_xy = 0;
        this.three.r_yw = 0;
        this.three.r_zx = 0;
        this.three.r_zy = 0;
        this.three.r_xy = 0;
        this.three.r1 = new THREE.Matrix4();
        this.three.r2 = new THREE.Matrix4();
        this.three.r3 = new THREE.Matrix4();
        this.three.r4 = new THREE.Matrix4();
        this.three.vert_vec4s = [];
        for (let i = 0; i < N + 1; i++) {
            this.three.vert_vec4s.push(new THREE.Vector4());
        }

        this.field_graphics = this.add.graphics();
        let field_mask_shape = this.make.graphics();
        field_mask_shape.fillStyle(0xffffff);
        field_mask_shape.beginPath();
        field_mask_shape.fillRect(F(50) - 0.5 + 1, F(100) - 0.5 + 1, F(320) - 2, H - F(200) - 2);
        let field_mask = field_mask_shape.createGeometryMask();
        this.field_graphics.setMask(field_mask);

        this.misc_graphics = this.add.graphics();

        this.score = 0;
    }

    update(time, delta) {
        this.field_graphics.clear();
        //console.log(this.moves);
        let debug = [this.intensity, this.moves.length];
        this.field_graphics.lineStyle(3, 0xdddd00);
        for (let i = 0; i < VISIBLE_MOVES; i++) {
            let m = this.moves[i].move;
            debug.push(`${'ZXCV'[m]} ${this.moves[i].mult}`);
            this.field_graphics.fillStyle([0xbb0000, 0x00bb00, 0x00bbbb, 0x0000dd][m]);
            let x = F(90 + 80 * m) - 0.5;
            let y = H - F(140 + i * 90) - 0.5;
            this.field_graphics.lineStyle(2, 0x000000);
            this.field_graphics.fillRoundedRect(x - F(35), y - F(35), F(70), F(70), F(10));
            this.field_graphics.strokeRoundedRect(x - F(35), y - F(35), F(70), F(70), F(10));

            this.field_graphics.lineStyle(3, 0xeeee00);
            if (this.moves[i].mult > 1) {
                this.field_graphics.lineBetween(x - F(30), y, x + F(30), y);
                let digits = balanced_ternary(this.moves[i].mult, 0);
                let start = -7.5 * (digits.length - 1);
                for (let j = 0; j < digits.length; j++) {
                    switch (digits[j]) {
                        case -1:
                            this.field_graphics.lineBetween(x + F(start + 15 * j), y, x + F(start + 15 * j), y + F(20));
                            break;
                        case 0:
                            this.field_graphics.strokeCircle(x + F(start + 15 * j), y, F(5));
                            break;
                        case 1:
                            this.field_graphics.lineBetween(x + F(start + 15 * j), y, x + F(start + 15 * j), y - F(20));
                            break;
                    }
                }
            }
        }
        this.misc_graphics.clear();
        this.misc_graphics.lineStyle(2, 0xdddd00);
        this.misc_graphics.lineBetween(F(450), H - F(20), W - F(50), H - F(20));
        // TODO: draw number line, transforms

        if (!this.climax) {
            this.intensity = Math.max(this.intensity - 0.00003 * this.intensity * delta, 0);
        }
        let intensity_mask_target = (1 - this.intensity) * (H - F(200) - 2);
        this.intensity_mask.height += (intensity_mask_target - this.intensity_mask.height) * 0.01 * delta;

        this.wikipedia_y = (this.wikipedia_y - delta * R2 * (0.01 + 0.19 * Math.pow(this.intensity, 4))) % (this.wikipedia.height + F(100));
        this.wikipedia.y = this.wikipedia_y - F(5) + (95);

        // TODO: 4d rotations

        this.three.r_zw += 1 * 0.00005 * delta;
        this.three.r_xy += 1.02 * 0.00005 * delta;
        this.three.r_yw += 1.04 * 0.00005 * delta;
        this.three.r_zx += 1.06 * 0.00005 * delta;
        this.three.r_zy += 1.08 * 0.00005 * delta;
        this.three.r_xy += 1.1 * 0.00005 * delta;

        this.three.r1.set(
            cos(this.three.r_xy), -sin(this.three.r_xy), 0, 0,
            sin(this.three.r_xy), cos(this.three.r_xy), 0, 0,
            0, 0, cos(this.three.r_zw), -sin(this.three.r_zw),
            0, 0, sin(this.three.r_zw), cos(this.three.r_zw)
        );
        this.three.r2.set(
            cos(this.three.r_zx), 0, sin(this.three.r_zx), 0,
            0, cos(this.three.r_yw), 0, -sin(this.three.r_yw),
            -sin(this.three.r_zx), 0, cos(this.three.r_zx), 0,
            0, sin(this.three.r_yw), 0, cos(this.three.r_yw),
        );
        this.three.r3.set(
            1, 0, 0, 0,
            0, cos(this.three.r_zy), sin(this.three.r_zy), 0,
            0, -sin(this.three.r_zy), cos(this.three.r_zy), 0,
            0, 0, 0, 1,
        );
        this.three.r4.set(
            cos(this.three.r_xy), -sin(this.three.r_xy), 0, 0,
            sin(this.three.r_xy), cos(this.three.r_xy), 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
        this.three.r1.multiply(this.three.r2);
        this.three.r1.multiply(this.three.r3);
        this.three.r1.multiply(this.three.r4);
        // NOTE: no idea if matrices need to be transposed or order of mult needs to be reversed...
        for (let i = 0; i < N + 1; i++) {
            let [v, id] = this.moves[0].simplex[i];
            this.three.vert_vec4s[id].fromArray(v);
            this.three.vert_vec4s[id].applyMatrix4(this.three.r1);
            v_smooth(this.three.vertices[id].position, this.three.vert_vec4s[id], delta * 0.01);
        }

        this.three.bounding_box.setFromObject(this.three.vertex_group);
        this.three.bounding_box.getBoundingSphere(this.three.bounding_sphere);
        //v_smooth(this.three.camera_pos, this.three.bounding_sphere.center, delta * 0.005);
        //this.three.camera.position.copy(this.three.camera_pos);
        this.three.camera.position.copy(this.three.bounding_sphere.center);
        this.three.camera.rotation.y += 0.0003 * delta;
        this.three.camera.position.x += 2 * this.three.bounding_sphere.radius * Math.sin(this.three.camera.rotation.y);
        this.three.camera.position.z += 2 * this.three.bounding_sphere.radius * Math.cos(this.three.camera.rotation.y);
        this.three.camera.far = this.three.bounding_sphere.radius * 10;
        this.three.camera.near = this.three.bounding_sphere.radius / 10;
        this.three.camera.updateProjectionMatrix();
        //v_smooth(this.three.sphere_debug.position, this.three.bounding_sphere.center, delta * 0.01);
        this.three.sphere_debug.position.copy(this.three.bounding_sphere.center);
        this.three.sphere_debug.scale.setScalar(this.three.bounding_sphere.radius);
        for (let i = 0; i < N + 1; i++) {
            this.three.vertices[i].scale.setScalar(this.three.bounding_sphere.radius);
        }
        for (let i = 0; i < N + 1; i++) {
            for (let j = i + 1; j < N + 1; j++) {
                let ind = i * (N + 1) + j;
                this.three.lines[ind].position.copy(this.three.vertices[i].position);
                this.three.line_vecs[ind].copy(this.three.vertices[j].position);
                this.three.line_vecs[ind].sub(this.three.vertices[i].position);
                this.three.lines[ind].scale.set(this.three.bounding_sphere.radius, this.three.bounding_sphere.radius, this.three.line_vecs[ind].length());
                this.three.lines[ind].lookAt(this.three.vertices[j].position);
            }
        }
        for (let i = 0; i < N + 1; i++) {
            //this.three.vertices[i].scale.setScalar(this.three.bounding_sphere.radius);
            this.three.vertex_mats[i].color.lerp(this.three.vertex_color, 0.005 * delta);
        }
        this.three.tets[0].matrix.makeBasis(this.three.line_vecs[1 * (N + 1) + 2], this.three.line_vecs[1 * (N + 1) + 3], this.three.line_vecs[1 * (N + 1) + 4]);
        this.three.tets[0].matrix.setPosition(this.three.vertices[1].position);
        this.three.tets[1].matrix.makeBasis(this.three.line_vecs[0 * (N + 1) + 2], this.three.line_vecs[0 * (N + 1) + 3], this.three.line_vecs[0 * (N + 1) + 4]);
        this.three.tets[1].matrix.setPosition(this.three.vertices[0].position);
        this.three.tets[2].matrix.makeBasis(this.three.line_vecs[0 * (N + 1) + 1], this.three.line_vecs[0 * (N + 1) + 3], this.three.line_vecs[0 * (N + 1) + 4]);
        this.three.tets[2].matrix.setPosition(this.three.vertices[0].position);
        this.three.tets[3].matrix.makeBasis(this.three.line_vecs[0 * (N + 1) + 1], this.three.line_vecs[0 * (N + 1) + 2], this.three.line_vecs[0 * (N + 1) + 4]);
        this.three.tets[3].matrix.setPosition(this.three.vertices[0].position);
        this.three.tets[4].matrix.makeBasis(this.three.line_vecs[0 * (N + 1) + 1], this.three.line_vecs[0 * (N + 1) + 2], this.three.line_vecs[0 * (N + 1) + 3]);
        this.three.tets[4].matrix.setPosition(this.three.vertices[0].position);
        this.three.renderer.render(this.three.scene, this.three.camera);
        //console.log(this.three.vertices);


        debug.push(this.three.bounding_sphere.radius);
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
        zoom: 1 / R,
        scene: Play,
        /*scale: {
            autoCenter: Phaser.Scale.CENTER_BOTH
        }*/
    };
    const game = new Phaser.Game(config);
}

main();