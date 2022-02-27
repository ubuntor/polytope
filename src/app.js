import * as THREE from 'https://cdn.skypack.dev/three@0.137.5';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';
import { mergeVertices } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/utils/BufferGeometryUtils.js';


// blargh everything's using == and != but i don't want to go back and fix everything

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
const TRIALS = 50;
const VOLUME_EPSILON = 0.001;
const WIKIPEDIA = `The Nelder-Mead method (also downhill simplex method, amoeba method, or polytope method) is a commonly applied numerical method used to find the minimum or maximum of an objective function in a multidimensional space. It is a direct search method (based on function comparison) and is often applied to nonlinear optimization problems for which derivatives may not be known. However, the Nelder-Mead technique is a heuristic search method that can converge to non-stationary points on problems that can be solved by alternative methods.

The Nelder-Mead technique was proposed by John Nelder and Roger Mead in 1965, as a development of the method of Spendley et al.

The method uses the concept of a simplex, which is a special polytope of n+1 vertices in n dimensions. Examples of simplices include a line segment on a line, a triangle on a plane, a tetrahedron in three-dimensional space and so forth.

The method approximates a local optimum of a problem with n variables when the objective function varies smoothly and is unimodal. Typical implementations minimize functions, and we maximize f(x) by minimizing -f(x).

For example, a suspension bridge engineer has to choose how thick each strut, cable, and pier must be. These elements are interdependent, but it is not easy to visualize the impact of changing any specific element. Simulation of such complicated structures is often extremely computationally expensive to run, possibly taking upwards of hours per execution. The Nelder-Mead method requires, in the original variant, no more than two evaluations per iteration, except for the shrink operation described later, which is attractive compared to some other direct-search optimization methods. However, the overall number of iterations to proposed optimum may be high.

Nelder-Mead in n dimensions maintains a set of n+1 test points arranged as a simplex. It then extrapolates the behavior of the objective function measured at each test point in order to find a new test point and to replace one of the old test points with the new one, and so the technique progresses. The simplest approach is to replace the worst point with a point reflected through the centroid of the remaining n points. If this point is better than the best current point, then we can try stretching exponentially out along this line. On the other hand, if this new point isn't much better than the previous value, then we are stepping across a valley, so we shrink the simplex towards a better point. An intuitive explanation of the algorithm from "Numerical Recipes":

The downhill simplex method now takes a series of steps, most steps just moving the point of the simplex where the function is largest ("highest point") through the opposite face of the simplex to a lower point. These steps are called reflections, and they are constructed to conserve the volume of the simplex (and hence maintain its nondegeneracy). When it can do so, the method expands the simplex in one or another direction to take larger steps. When it reaches a "valley floor", the method contracts itself in the transverse direction and tries to ooze down the valley. If there is a situation where the simplex is trying to "pass through the eye of a needle", it contracts itself in all directions, pulling itself in around its lowest (best) point.

Unlike modern optimization methods, the Nelder-Mead heuristic can converge to a non-stationary point, unless the problem satisfies stronger conditions than are necessary for modern methods. Modern improvements over the Nelder-Mead heuristic have been known since 1979.

Many variations exist depending on the actual nature of the problem being solved. A common variant uses a constant-size, small simplex that roughly follows the gradient direction (which gives steepest descent). Visualize a small triangle on an elevation map flip-flopping its way down a valley to a local bottom. This method is also known as the flexible polyhedron method. This, however, tends to perform poorly against the method described in this article because it makes small, unnecessary steps in areas of little interest.`
const CODE = `n = 4
ALPHA = 1
BETA = 1+2/n
GAMMA = 0.75-1/2n
DELTA = 1-1/n
while true:
  sort xs: f(x1) >= ... >= f(x5)
  define fi = f(xi)
  xc = (x1+...+x5)/5
  xr = xc+ALPHA*(xc-x5)
  xe = xc+BETA*(xr-xc)
  xic = xc-GAMMA*(xr-xc)
  xoc = xc+GAMMA*(xr-xc)
  if f1 > fr >= f4:
    // REFLECT
    x5 = xr
  elif fr >= f1:
    if fe >= fr:
      // EXPAND
      x5 = xe
    else:
      // REFLECT
      x5 = xr
  elif f4 > fr >= f5:
    if foc > fr:
      // CONTRACT (OUTSIDE)
      x5 = xoc
    else:
      // SHRINK
      for 2 <= i <= 5:
        xi = x1+DELTA*(xi-x1)
  else:
    if fic >= fr:
      // CONTRACT (INSIDE)
      x5 = xic
    else:
      // SHRINK
      for 2 <= i <= 5:
        xi = x1+DELTA*(xi-x1)`
const loader = new GLTFLoader();
const gltf = await new Promise((resolve, reject) => loader.load('tet.glb', data => resolve(data), null, reject));
const cos = Math.cos;
const sin = Math.sin;
const words = [
    ['expand', 'stretch', 'larger', 'inflate', 'extend', 'bigger', 'fill', 'grow', 'reach', 'further', 'more'],
    ['reflect', 'turn over', 'turn around', 'other side', 'flip', 'go over', 'go under', 'go through', 'go above', 'go below'],
    ['contract', 'squeeze', 'squish', 'shrink', 'smaller', 'deflate', 'hug', 'closer', 'compress', 'within'],
]
words[3] = words[2];
const NUM_TEXT_PARTICLES = 50;
const VERTEX_COLORS = [0x7f3f3f, 0x727f3f, 0x3f7f59, 0x3f597f, 0x723f7f];
const CAMERA_THUMP_ZOOM = 1.06;

const background_canvas = document.createElement('canvas');
document.body.appendChild(background_canvas);
background_canvas.style.position = "absolute";
background_canvas.style.top = `0px`;
background_canvas.style.left = `0px`;
background_canvas.width = 960;
background_canvas.height = 720;
background_canvas.style.zIndex = '-2';
const background_ctx = background_canvas.getContext('2d');
background_ctx.fillStyle = "#111111";

// modified from https://www.shadertoy.com/view/MsS3Wc
const finale_shader = `
#define SHADER_NAME FINALE_FS

precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uSat;

varying vec2 outTexCoord;

vec3 hsv2rgb_smooth( in vec3 c ) {
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
	rgb = rgb*rgb*(3.0-2.0*rgb); // cubic smoothing
	return c.z * mix( vec3(1.0), rgb, c.y);
}

void main() {
	vec2 uv = outTexCoord.xy;
    vec3 rainbow = hsv2rgb_smooth(vec3(uv.x+uv.y+uTime, uSat, 1));
    gl_FragColor = texture2D(uMainSampler,outTexCoord) * vec4(rainbow,1.0);
}
`;

class FinaleFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            name: 'FinaleFX',
            fragShader: finale_shader,
            uniforms: [
                'uMainSampler',
                'uTime',
                'uSat'
            ]
        });
        this.saturation = 0;
        // does this get constructed an extra time by the game startup???
        console.log("created finale pipeline");
    }
    onPreRender() {
        this.setTime('uTime');
        this.set1f('uSat', this.saturation);
    }
}

function balanced_ternary(x, precision) {
    var x = Math.floor(x * Math.pow(3, precision));
    let digits = [];
    let i = 0;
    while (x != 0 || i < precision) {
        let digit = [0, 1, -1][(x % 3 + 3) % 3];
        digits.push(digit);
        x -= digit;
        x /= 3;
        i++;
        if (i == precision) {
            digits.push(2);
        }
    }
    if (digits.length == 0) {
        return [0];
    }
    digits.reverse();
    return digits;
}

function f(a) {
    let [x, y, z, w] = a;
    // -McCormick - Styblinski-Tang: (-0.547, -1.547, -2.904, -2.904)
    // + gaussian noise: mean 0, stdev 0.0001
    return (0.0001 * (Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()))) - (Math.sin(x + y) + (x - y) ** 2 - 1.5 * x + 2.5 * y + 1) - ((z ** 4 - 16 * z ** 2 + 5 * z + w ** 4 - 16 * w ** 2 + 5 * w) / 2);
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
    // nudge vertices randomly to prevent simplex from shrinking too much
    // and messing up 3d visuals due to floating-point precision
    for (let i = 0; i < N + 1; i++) {
        simplex[i][0] = vec_nudge(simplex[i][0]);
        f_simplex[simplex[i][1]] = f(simplex[i][0]);
    }
    simplex.sort((a, b) => f_simplex[b[1]] - f_simplex[a[1]]);
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
    if (f1 > fr && fr >= fn) {
        //console.log(".R.. reflect");
        move = 1;
        simplex_replace(simplex, xr);
        changed[idn1] = true;
    } else if (fr >= f1) {
        if (fe >= fr) {
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
    } else if (fn > fr && fr >= fn1) {
        if (foc > fr) {
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
    } else { // fr < fn1
        if (fic >= fn1) {
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
    f_simplex.sort((a, b) => b - a);
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

function init_moves(f, x0_init) {
    let best_score = 1;
    let best_moves = [];
    let best_gen;

    for (let trial = 0; trial < TRIALS; trial++) {
        let x0 = x0_init.map((e) => e + 0.01 * (Math.random() * 2 - 1));
        let simplex = make_simplex(x0);
        let moves = [];
        let gen = next_states(f, simplex);
        while (moves.length < 200) {
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

class Title extends Phaser.Scene {
    constructor() {
        super({ key: 'Title' });
    }
    create() {
        this.background_graphics = this.add.graphics();
        this.input.once('pointerdown', function () {
            this.scene.start('Play');
        }, this);
        this.background_rotations = [];
        for (let i = 0; i < 9; i++) {
            this.background_rotations.push(Math.random() * Math.PI * 2000);
        }
        // regular origin-centered 5-cell
        this.vertices_orig = [
            new THREE.Vector4(1 / Math.sqrt(10), 1 / Math.sqrt(6), 1 / Math.sqrt(3), 1),
            new THREE.Vector4(1 / Math.sqrt(10), 1 / Math.sqrt(6), 1 / Math.sqrt(3), -1),
            new THREE.Vector4(1 / Math.sqrt(10), 1 / Math.sqrt(6), -2 / Math.sqrt(3), 0),
            new THREE.Vector4(1 / Math.sqrt(10), -Math.sqrt(3 / 2), 0, 0),
            new THREE.Vector4(-2 * Math.sqrt(2 / 5), 0, 0, 0)
        ];
        this.vertices = [
            new THREE.Vector4(),
            new THREE.Vector4(),
            new THREE.Vector4(),
            new THREE.Vector4(),
            new THREE.Vector4()
        ];
        this.vertices_draw = [];
        for (let i = 0; i < 5; i++) {
            this.vertices_draw.push(this.add.circle(0, 0, F(20), VERTEX_COLORS[i]));
        }
        this.theta = Math.random() * Math.PI * 2;
        this.r1 = new THREE.Matrix4();
        this.r2 = new THREE.Matrix4();
        this.r3 = new THREE.Matrix4();
        this.r4 = new THREE.Matrix4();

        this.add.text(W / 2, H / 2 - F(200), 'POLYTOPE', { font: `${F(176)}pt Thaleah`, fill: '#ff9cf3' }).setOrigin(0.5);
        this.add.text(W / 2, H / 2 + F(200), 'CLICK TO BEGIN', { font: `${F(48)}pt Covenant`, fill: '#FFFFFF' }).setOrigin(0.5);
    }
    update(time, delta) {
        background_ctx.fillRect(0, 0, 960, 720);
        this.background_graphics.clear();
        this.background_graphics.lineStyle(3, 0x3f3f3f);
        this.background_graphics.fillStyle(0x3f3f3f);
        // drawing random values that look vaguely good
        for (let i = 0; i < 9; i++) {
            let r = 150 + i * 50;
            let x = W / 2;
            let y = H / 2;
            let digits = balanced_ternary(this.background_rotations[i] / 200, 7);
            let width = 1.2 * (50 / r);
            let size = 20;
            this.background_rotations[i] += delta * 0.0002 * (9 - i);
            let start = this.background_rotations[i] - (digits.length * width) / 2;
            this.background_graphics.beginPath();
            this.background_graphics.arc(x, y, F(r), start, start + digits.length * width);
            this.background_graphics.strokePath();
            for (let j = 0; j < digits.length; j++) {
                let cur_theta = start + width * (j + 0.5);
                switch (digits[j]) {
                    case -1:
                        this.background_graphics.lineBetween(x + Math.cos(cur_theta) * F(r), y + Math.sin(cur_theta) * F(r), x + Math.cos(cur_theta) * F(r - size), y + Math.sin(cur_theta) * F(r - size));
                        break;
                    case 0:
                        this.background_graphics.strokeCircle(x + Math.cos(cur_theta) * F(r), y + Math.sin(cur_theta) * F(r), F(size));
                        break;
                    case 1:
                        this.background_graphics.lineBetween(x + Math.cos(cur_theta) * F(r), y + Math.sin(cur_theta) * F(r), x + Math.cos(cur_theta) * F(r + size), y + Math.sin(cur_theta) * F(r + size));
                        break;
                    case 2:
                        this.background_graphics.beginPath();
                        this.background_graphics.moveTo(x + Math.cos(cur_theta) * F(r - 6), y + Math.sin(cur_theta) * F(r - 6));
                        this.background_graphics.lineTo(x + Math.cos(cur_theta) * F(r) - Math.sin(cur_theta) * F(6), y + Math.sin(cur_theta) * F(r) + Math.cos(cur_theta) * F(6));
                        this.background_graphics.lineTo(x + Math.cos(cur_theta) * F(r + 6), y + Math.sin(cur_theta) * F(r + 6));
                        this.background_graphics.lineTo(x + Math.cos(cur_theta) * F(r) + Math.sin(cur_theta) * F(6), y + Math.sin(cur_theta) * F(r) - Math.cos(cur_theta) * F(6));
                        this.background_graphics.closePath();
                        this.background_graphics.fillPath();
                        break;
                }
            }
        }
        this.theta += 0.0005 * delta;
        if (this.theta > Math.PI * 2) {
            this.theta -= Math.PI * 2;
        }
        this.r1.set(
            cos(this.theta), -sin(this.theta), 0, 0,
            sin(this.theta), cos(this.theta), 0, 0,
            0, 0, cos(this.theta), -sin(this.theta),
            0, 0, sin(this.theta), cos(this.theta)
        );
        this.r2.set(
            cos(this.theta), 0, sin(this.theta), 0,
            0, cos(this.theta), 0, -sin(this.theta),
            -sin(this.theta), 0, cos(this.theta), 0,
            0, sin(this.theta), 0, cos(this.theta),
        );
        this.r3.set(
            1, 0, 0, 0,
            0, cos(this.theta), sin(this.theta), 0,
            0, -sin(this.theta), cos(this.theta), 0,
            0, 0, 0, 1,
        );
        this.r4.set(
            cos(this.theta), -sin(this.theta), 0, 0,
            sin(this.theta), cos(this.theta), 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
        this.r1.multiply(this.r2);
        this.r1.multiply(this.r3);
        this.r1.multiply(this.r4);
        for (let i = 0; i < 5; i++) {
            this.vertices[i].copy(this.vertices_orig[i]);
            this.vertices[i].applyMatrix4(this.r1);
            this.vertices_draw[i].setPosition(W / 2 + F(300) * this.vertices[i].x, H / 2 + F(300) * this.vertices[i].y);
            this.vertices_draw[i].setScale(1 + this.vertices[i].z / 2)
        }
        this.background_graphics.lineStyle(5, 0x5f5f5f);
        for (let i = 0; i < 5; i++) {
            for (let j = i + 1; j < 5; j++) {
                this.background_graphics.lineGradientStyle(5, VERTEX_COLORS[i], VERTEX_COLORS[j], VERTEX_COLORS[i], VERTEX_COLORS[j]);
                this.background_graphics.lineBetween(this.vertices_draw[i].x, this.vertices_draw[i].y, this.vertices_draw[j].x, this.vertices_draw[j].y);
            }
        }
    }
}

class Play extends Phaser.Scene {
    constructor() {
        super({ key: 'Play' });
    }
    async preload() {
        this.loading_text = this.add.text(W / 2, H / 2, 'loading...', { font: `${48 * FS}pt Covenant`, fill: '#FFFFFF' }).setOrigin(0.5);
        this.load.plugin('rexroundrectangleplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/8b4ad8083e48019f39b37d8f629379851ca8ec13/dist/rexroundrectangleplugin.min.js', true);
        for (let i = 1; i <= 11; i++) {
            let base = 'pluck' + i.toString();
            this.load.audio(base, [base + '.wav']);
        }
        for (let i = 1; i <= 7; i++) {
            let base = 'loop' + i.toString();
            this.load.audio(base, [base + '.wav']);
        }
        this.load.audio('finale', ['finale.wav']);
    }

    set_code_color(i, is_green) {
        let line = this.code[i];
        if (line.tween) {
            line.tween.remove();
        }
        let prev_value = line.color_val;
        if (prev_value === undefined) {
            prev_value = 255;
        }
        line.tween = this.tweens.addCounter({
            from: prev_value,
            to: is_green ? 0 : 255,
            duration: 500,
            ease: 'Expo.easeOut',
            onUpdate: function (tween) {
                let value = Math.floor(tween.getValue());
                line.setTint(0x00ff00 + 0x010001 * value);
                line.color_val = value;
            }
        });
    }

    color_code_lines() {
        for (let i = 13; i <= 38; i++) {
            this.set_code_color(i, false);
        }
        let move = this.moves[0];
        let f1 = move.f_simplex[0];
        let f4 = move.f_simplex[3];
        let f5 = move.f_simplex[4];
        let fr = move.fr;
        let fe = move.fe;
        let foc = move.foc;
        let fic = move.fic;
        if (f1 > fr && fr >= f4) {
            this.set_code_color(13, true);
            this.set_code_color(14, true);
            this.set_code_color(15, true);
        } else if (fr >= f1) {
            if (fe >= fr) {
                this.set_code_color(16, true);
                this.set_code_color(17, true);
                this.set_code_color(18, true);
                this.set_code_color(19, true);
            } else {
                this.set_code_color(16, true);
                this.set_code_color(20, true);
                this.set_code_color(21, true);
                this.set_code_color(22, true);
            }
        } else if (f4 > fr && fr >= f5) {
            if (foc > fr) {
                this.set_code_color(23, true);
                this.set_code_color(24, true);
                this.set_code_color(25, true);
                this.set_code_color(26, true);
            } else {
                this.set_code_color(23, true);
                this.set_code_color(27, true);
                this.set_code_color(28, true);
                this.set_code_color(29, true);
                this.set_code_color(30, true);
            }
        } else {
            if (fic >= fr) {
                this.set_code_color(31, true);
                this.set_code_color(32, true);
                this.set_code_color(33, true);
                this.set_code_color(34, true);
            } else {
                this.set_code_color(31, true);
                this.set_code_color(35, true);
                this.set_code_color(36, true);
                this.set_code_color(37, true);
                this.set_code_color(38, true);
            }
        }
    }

    judge(x, mult) {
        for (let i = 0; i < 3; i++) {
            let target = this.judge_texts[i];
            if (target.tweens) {
                target.tweens[0].remove();
                target.tweens[1].remove();
            }
            if (x == i) {
                target.setAlpha(1);
                target.setScale(1.2);
                target.tweens = [this.tweens.add({
                    targets: target,
                    scale: 1,
                    duration: 200,
                    ease: 'Quad.easeOut',
                }),
                this.tweens.add({
                    targets: target,
                    alpha: 0,
                    delay: 1000,
                    duration: 500,
                    ease: 'Quad.easeOut',
                })];
            } else {
                target.setAlpha(0);
            }
        }
    }

    do_ending() {
        this.end_screen = true;
        if (this.camera_thump) {
            this.camera_thump.remove();
        }
        this.tweens.add({
            targets: this.convergence,
            y: F(100),
            delay: 500,
            duration: 1000,
            ease: 'Quad.easeOut'
        });
        this.time.addEvent({
            delay: 1500,
            callback: () => {
                this.ending_texts[0].setAlpha(1);
                this.sound.play('pluck1', { volume: 0.5 });
                this.sound.play('pluck6', { volume: 0.5 });
            }
        })
        this.time.addEvent({
            delay: 2000,
            callback: () => {
                this.ending_draw[0] = true;
                this.sound.play('pluck2', { volume: 0.5 });
                this.sound.play('pluck7', { volume: 0.5 });
            }
        })
        this.time.addEvent({
            delay: 2500,
            callback: () => {
                this.ending_texts[1].setAlpha(1);
                this.sound.play('pluck3', { volume: 0.5 });
                this.sound.play('pluck8', { volume: 0.5 });
            }
        })
        this.time.addEvent({
            delay: 3000,
            callback: () => {
                this.ending_draw[1] = true;
                this.sound.play('pluck4', { volume: 0.5 });
                this.sound.play('pluck9', { volume: 0.5 });
            }
        })
        this.time.addEvent({
            delay: 3500,
            callback: () => {
                this.ending_texts[2].setAlpha(1);
                this.sound.play('pluck5', { volume: 0.5 });
                this.sound.play('pluck10', { volume: 0.5 });
            }
        })
        this.time.addEvent({
            delay: 4000,
            callback: () => {
                this.ending_draw[2] = true;
                this.sound.play('pluck6', { volume: 0.5 });
                this.sound.play('pluck11', { volume: 0.5 });
            }
        })
        this.time.addEvent({
            delay: 5000,
            callback: () => {
                for (let i = 0; i < this.loops.length; i++) {
                    this.loops[i].destroy();
                }
                // why are these sound delays in seconds instead of milliseconds?
                this.ending_texts[3].setAlpha(1);
                this.sound.play('pluck1', { volume: 0.5 });
                this.sound.play('pluck3', { volume: 0.5, delay: 0.03 });
                this.sound.play('pluck4', { volume: 0.5, delay: 0.06 });
                this.sound.play('pluck6', { volume: 0.5, delay: 0.09 });
                this.sound.play('pluck11', { volume: 0.5, delay: 0.12 });
                this.is_replayable = true;
            }
        })
    }

    combo_break() {
        if (this.combo_break_tween) {
            this.combo_break_tween[0].remove();
            this.combo_break_tween[1].remove();
        }
        this.combo_break_text.setScale(1.2);
        this.combo_break_tween = [this.tweens.add({
            targets: this.combo_break_text,
            scale: 1,
            duration: 100,
            ease: 'Quad.easeOut'
        }), this.tweens.add({
            targets: this.combo_break_text,
            scaleX: 1.5,
            scaleY: 0,
            delay: 1000,
            duration: 100,
            ease: 'Quad.easeOut'
        })];
        this.combo_text.setAlpha(0);
    }

    process_move(x) {
        if (this.is_replayable && x == 0) {
            this.reinit();
            return;
        }
        if (this.end_screen) {
            return;
        }
        this.receptors[x].setScale(0.8);
        if (x == this.moves[0].move || this.finale) {
            this.flashes[x].setScale(1);
            this.flashes[x].setAlpha(1);
            let wordlist = words[this.moves[0].move];

            let old_word = this.old_words[x];
            let new_word = wordlist[Math.floor(Math.random() * wordlist.length)];
            while (old_word == new_word) {
                new_word = wordlist[Math.floor(Math.random() * wordlist.length)];
            }
            this.old_words[x] = new_word;
            if (this.text_particles[this.text_particle_index].tweens) {
                this.text_particles[this.text_particle_index].tweens[0].remove();
                this.text_particles[this.text_particle_index].tweens[1].remove();
            }
            this.text_particles[this.text_particle_index].setAlpha(1).setScale(1).setText(new_word);
            if (this.finale) {
                this.text_particles[this.text_particle_index].setPosition(W / 2 + Phaser.Math.FloatBetween(-300, 300), H / 2 + Phaser.Math.FloatBetween(-400, 400));
            }
            this.text_particles[this.text_particle_index].tweens = [this.tweens.add({
                targets: this.text_particles[this.text_particle_index],
                scale: 0.25,
                duration: 2000 / (1 + this.intensity - (this.finale ? 0.5 : 0)),
                ease: 'Quad.easeOut',
            }),
            this.tweens.add({
                targets: this.text_particles[this.text_particle_index],
                alpha: 0,
                duration: 2000 / (1 + this.intensity - (this.finale ? 0.5 : 0)),
                ease: 'Expo.easeOut',
            })];

            let judgement;
            if (this.potential > 0.8) {
                judgement = 0;
            } else if (this.potential > 0.6) {
                judgement = 1;
            } else {
                judgement = 2;
            }
            if (!this.finale) {
                this.judge(judgement, this.moves[0].mult);
                if (judgement == 2) {
                    if (this.cur_combo > 1) {
                        this.combo_break();
                    }
                    this.cur_combo = 1;
                } else {
                    this.cur_combo++;
                    if (this.cur_combo > 1) {
                        this.combo_text.setAlpha(1);
                    }
                    this.max_combo = Math.max(this.cur_combo, this.max_combo);
                }
            }
            this.text_particle_index = (this.text_particle_index + 1) % NUM_TEXT_PARTICLES;

            if (this.finale) {
                this.finale_bonus += 100;
                this.score += 100;
            } else {
                let points = Math.floor(69 * (1 + 8 * Math.pow(this.intensity, 2)) * Math.pow(this.potential, 2));
                this.draw_points = points;
                this.draw_mult = this.moves[0].mult;
                this.score += points * this.moves[0].mult;
            }
            for (let i = 0; i < N + 1; i++) {
                if (this.moves[0].changed[i]) {
                    this.three.vertex_mats[i].color.setHex(0xf23af2);
                }
            }
            this.moves.shift();
            if (this.moves.length < VISIBLE_MOVES) {
                this.moves = this.moves.concat(this.gen.next().value);
            }
            if (!this.finale) {
                this.intensity += 0.008 * this.potential;
                if (this.intensity > 1) {
                    // finale!
                    this.finale = true;
                    this.combo_text.setAlpha(0);
                    this.is_warning = false;
                    this.warning.setAlpha(0);
                    this.intensity = 1;
                    this.potential = 1;
                    this.finale_container.setAlpha(1).setScale(1.2);
                    this.convergence.setScale(0.75);
                    this.convergence.setY(H / 2);
                    if (this.camera_thump) {
                        this.camera_thump.remove();
                    }
                    this.cameras.main.zoom = CAMERA_THUMP_ZOOM;
                    this.camera_thump = this.tweens.add({
                        targets: this.cameras.main,
                        zoom: 1,
                        loop: -1,
                        duration: 333,
                        ease: 'Sine.easeOut',
                    });
                    this.tweens.add({
                        targets: this.convergence,
                        alpha: 1,
                        duration: 7000,
                        ease: 'Quad.easeOut',
                        onComplete: function (tween, targets, scene) {
                            scene.do_ending();
                        },
                        onCompleteParams: [this]
                    });
                    this.tweens.add({
                        targets: this.convergence,
                        scale: 1,
                        duration: 7000,
                        ease: 'Quad.easeOut',
                    });
                    this.tweens.add({
                        targets: this.finale_pipeline,
                        saturation: 0.4,
                        duration: 1000,
                        ease: 'Quad.easeOut',
                    });
                    this.tweens.add({
                        targets: this.finale_container,
                        scale: 1,
                        duration: 1000,
                        ease: 'Quad.easeOut',
                    });
                    this.tweens.add({
                        targets: this.finale_rect,
                        alpha: 1,
                        delay: 2000,
                        duration: 5000,
                        ease: 'Quint.easeIn'
                    });
                    let finale_music = this.sound.add('finale', { volume: 0 });
                    finale_music.play();
                    this.tweens.add({
                        targets: finale_music,
                        volume: 1,
                        duration: 5000,
                        ease: 'Linear'
                    });
                    this.tweens.add({
                        targets: this.loops,
                        volume: VOLUME_EPSILON,
                        duration: 1000,
                        ease: 'Linear'
                    });
                    this.finale_rect_darken.setAlpha(0);
                    this.tweens.add({
                        targets: this.finale_rect_darken,
                        alpha: 0.7,
                        delay: 7500,
                        duration: 1000,
                        ease: 'Quad.easeOut'
                    });
                }
                this.potential = 0;
            }
            this.color_code_lines();
            this.sound.play('pluck' + Math.floor(1 + Math.random() * 11).toString(), { volume: 0.5 });
        } else {
            if (!this.finale) {
                this.intensity = Math.max(this.intensity - 0.015, 0);
                if (this.cur_combo > 1) {
                    this.combo_break();
                    this.cur_combo = 0;
                }
            }
        }
    }

    reinit() {
        [this.moves, this.gen] = init_moves(f, [-0.5, -1, -2, -2]);
        this.color_code_lines();
        this.score = 0;
        this.score_draw = 0;
        this.finale_bonus = 0;
        this.finale_bonus_draw = 0;
        this.text_particle_index = 0;
        this.f1_draw = 0;
        this.fn1_draw = 0;
        this.warning_offset = 0;
        this.range_draw = 0;
        this.mean_draw = 0;
        this.intensity = 0;
        this.intensity_smooth = 0;
        this.wikipedia_y = 0;
        this.potential = 1;
        this.is_warning = false;
        this.warning.setAlpha(0);
        this.finale = false;
        this.finale_rect.setAlpha(0);
        this.end_screen = false;
        this.ending_graphics.clear();
        this.finale_container.setAlpha(0);
        this.convergence.setAlpha(0);
        if (this.camera_thump) {
            this.camera_thump.remove();
        }
        this.cameras.main.zoom = 1;
        this.is_replayable = false;
        for (let i = 0; i < NUM_TEXT_PARTICLES; i++) {
            this.text_particles[i].setPosition(W / 2, H / 2);
        }
        this.intensity_mask.height = H - F(200) - 2;
        this.cur_combo = 0;
        this.max_combo = 0;
        this.finale_pipeline.saturation = 0;
        this.draw_points = 0;
        this.draw_mult = 0;
        for (let i = 0; i < 4; i++) {
            this.ending_texts[i].setAlpha(0);
            this.ending_draw[i] = false;
        }
        this.finale_rect_darken.setAlpha(0);
        // hopefully this prevents the music cutting out randomly...
        this.loops = []
        for (let i = 1; i <= 7; i++) {
            let base = 'loop' + i.toString();
            this.loops.push(this.sound.add(base));
        }
        for (let i = 0; i < this.loops.length; i++) {
            this.loops[i].play(
                { volume: VOLUME_EPSILON, loop: true }
            );
        }
    }

    create() {
        for (let i of document.getElementsByClassName('katex')) {
            i.style.display = 'block';
        }

        this.add.rectangle(F(50) - 0.5, F(100) - 0.5, F(320), H - F(200)).setStrokeStyle(1, 0xf23af2).setOrigin(0);
        for (let i = 1; i <= 3; i++) {
            this.add.line(0, 0, F(50 + 80 * i) - 0.5, F(100) - 0.5, F(50 + 80 * i) - 0.5, H - F(100) - 0.5).setStrokeStyle(1, 0xf23af2, 0.33).setOrigin(0, 0);
        }
        this.add.text(F(390), F(10), 'OBJECTIVE FUNCTION', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.add.text(F(390), F(75), 'TRANSFORMS', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.add.text(W - F(200), H - F(110), 'MAX COMBO', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.add.text(W - F(200), H - F(55), 'SCORE', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
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
        });
        this.wikipedia.setMask(mask);

        this.add.text(W - F(250), F(160), 'ALGORITHM', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' }).setOrigin(0, 1);
        // pixel fonts + devicePixelRatio nonsense = :(
        let codelines = CODE.split('\n');
        this.code = [];
        for (let i = 0; i < codelines.length; i++) {
            this.code.push(this.make.text({ x: F(950), y: F(150 + i * 16), text: codelines[i], style: { font: `${48 * FS}pt m3x6`, fill: 'white' } }));
        }
        let codescale = F(248) / this.code[6].displayWidth;
        for (let i = 0; i < codelines.length; i++) {
            this.code[i].setScale(codescale);
        }

        let keycodes = [Phaser.Input.Keyboard.KeyCodes.Z, Phaser.Input.Keyboard.KeyCodes.X, Phaser.Input.Keyboard.KeyCodes.C, Phaser.Input.Keyboard.KeyCodes.V];
        for (let i = 0; i < keycodes.length; i++) {
            this.input.keyboard.addKey(keycodes[i]).on('down', function (key, event) {
                this.process_move(i);
            }, this);
        }
        // TODO: remove this
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', function (key, event) {
            this.process_move(this.moves[0].move);
        }, this);
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L).on('down', function (key, event) {
            this.intensity = 0.9;
        }, this);
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P).on('down', function (key, event) {
            this.intensity = 1;
        }, this);
        // end remove this

        this.add.text(F(35), H - F(100), 'INTENSITY', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' }).setOrigin(0, 1).setAngle(-90);
        this.add.rectangle(F(35), F(100), F(9), H - F(200), 0xf23af2).setOrigin(0);
        this.intensity_mask = this.add.rectangle(F(35) + 1, F(100) + 1, F(9) - 2, H - F(200) - 2, 0x000000).setOrigin(0);
        this.add.text(F(385), H - F(98), 'POTENTIAL', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' }).setOrigin(1, 1).setAngle(90);

        this.add.rectangle(F(377), F(600), F(8), H - F(700), 0xf23af2).setOrigin(0);
        this.potential_mask = this.add.rectangle(F(377) + 1, F(600) + 1, F(8) - 2, 0, 0x000000).setOrigin(0);

        this.add.text(F(390), F(185), 'POLYTOPE', { font: `${12 * FS}pt Covenant`, fill: '#f23af2' });
        this.polytope_canvas = document.createElement('canvas');
        document.body.appendChild(this.polytope_canvas);
        this.polytope_canvas.style.position = "absolute";
        this.polytope_canvas.style.top = `150px`;
        this.polytope_canvas.style.left = `312px`;
        this.polytope_canvas.width = 480;
        this.polytope_canvas.height = 480;
        this.polytope_canvas.style.zIndex = '-1';
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
        light3.position.set(-100, -200, -100);
        this.three.scene.add(light3);
        this.three.camera.position.z = 5;

        this.three.vertices = [];
        this.three.vertex_mats = [];
        this.three.vertex_colors = [];
        this.three.vertex_group = new THREE.Group();
        this.three.scene.add(this.three.vertex_group);
        let sphere_geom = new THREE.SphereGeometry(0.05, 32, 16);
        let grey = new THREE.Color(0x333333);
        for (let i = 0; i < N + 1; i++) {
            let color = new THREE.Color(VERTEX_COLORS[i]);
            color.lerp(grey, 0.7);
            this.three.vertex_colors.push(color);
            let material = new THREE.MeshPhongMaterial({ color, shininess: 100 });
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

        tet_geom.applyMatrix4(new THREE.Matrix4().makeScale(0.5, 0.5, 0.5));
        tet_geom.deleteAttribute('normal');
        tet_geom = mergeVertices(tet_geom);
        tet_geom.computeVertexNormals();
        console.log(tet_geom);

        // modified from https://codepen.io/marioecg/pen/abmXKvW
        const noise = `
        // GLSL textureless classic 3D noise "cnoise",
        // with an RSL-style periodic variant "pnoise".
        // Author:  Stefan Gustavson (stefan.gustavson@liu.se)
        // Version: 2011-10-11
        //
        // Many thanks to Ian McEwan of Ashima Arts for the
        // ideas for permutation and gradient selection.
        //
        // Copyright (c) 2011 Stefan Gustavson. All rights reserved.
        // Distributed under the MIT license. See LICENSE file.
        // https://github.com/ashima/webgl-noise
        //
      
        vec3 mod289(vec3 x)
        {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
      
        vec4 mod289(vec4 x)
        {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
      
        vec4 permute(vec4 x)
        {
          return mod289(((x*34.0)+1.0)*x);
        }
      
        vec4 taylorInvSqrt(vec4 r)
        {
          return 1.79284291400159 - 0.85373472095314 * r;
        }
      
        vec3 fade(vec3 t) {
          return t*t*t*(t*(t*6.0-15.0)+10.0);
        }
      
        // Classic Perlin noise, periodic variant
        float pnoise(vec3 P, vec3 rep)
        {
          vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
          vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);
          vec3 Pf0 = fract(P); // Fractional part for interpolation
          vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;
      
          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);
      
          vec4 gx0 = ixy0 * (1.0 / 7.0);
          vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);
      
          vec4 gx1 = ixy1 * (1.0 / 7.0);
          vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);
      
          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
          vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
          vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
          vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
          vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
      
          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;
      
          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);
      
          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
          return 2.2 * n_xyz;
        }`;

        const vertexShader = `  
        varying vec3 vNormal;
        
        uniform float uTime;
        uniform float uNoiseDensity;
        uniform float uNoiseStrength;
        
        ${noise}
        
        void main() {
          float t = uTime;
          float distortion = pnoise((normal + t) * uNoiseDensity, vec3(10.0)) * uNoiseStrength;
          vec3 pos = position + (normal * distortion);
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
        }`;

        const fragmentShader = `
        varying vec3 vNormal;
        
        uniform float uTime;
        
        void main() {
          vec3 color = vec3(1.0);
          vec3 normal = vNormal;
          // ensure flipped normals look the same
          if (normal.x + normal.y + normal.z < 0.0) {
              normal = normal - 2.0*dot(normal, normalize(vec3(1.0,1.0,1.0)));
          }
          gl_FragColor = vec4(0.5+0.5*normalize(normal), 0.3);
        }`;

        //this.three.tet_material = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        this.three.tet_material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uSpeed: { value: 4 },
                uNoiseDensity: { value: 1.5 },
                uNoiseStrength: { value: 0.1 },
            },
            side: THREE.DoubleSide,
            transparent: true
        });
        //console.log(this.tet_material);

        for (let i = 0; i < N + 1; i++) {
            let tet = new THREE.Mesh(tet_geom, this.three.tet_material);
            tet.matrixAutoUpdate = false;
            this.three.tets.push(tet);
            this.three.scene.add(tet);
            this.three.tet_p.push(new THREE.Vector4());
        }

        this.three.r_zw = Math.random() * 2 * Math.PI;
        this.three.r_xy = Math.random() * 2 * Math.PI;
        this.three.r_yw = Math.random() * 2 * Math.PI;
        this.three.r_zx = Math.random() * 2 * Math.PI;
        this.three.r_zy = Math.random() * 2 * Math.PI;
        this.three.r_xy2 = Math.random() * 2 * Math.PI;
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

        this.finale_container = this.add.container(F(210) - 0.5, F(448)).setAlpha(0);
        let finale_piece = this.add.rexRoundRectangle(0, 0, F(312), H - F(203), { tl: 0, tr: 0, bl: F(10), br: F(10) }, 0xffffff).setOrigin(0.5).setPostPipeline(FinaleFX);
        this.finale_pipeline = finale_piece.getPostPipeline(FinaleFX);
        this.finale_container.add(finale_piece);
        this.finale_container.add(this.add.text(F(5), F(-100), 'FINALE', { font: `${36 * FS}pt Covenant`, fill: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5));
        this.finale_container.add(this.add.text(F(5), F(50), 'BONUS', { font: `${24 * FS}pt Covenant`, fill: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5));

        this.flashes = [];
        for (let i = 0; i < 4; i++) {
            this.flashes.push(this.add.rexRoundRectangle(F(90 + 80 * i) - 0.5, H - F(140) - 0.5, F(70), F(70), F(10), 0xFFFFFF).setAlpha(0));
        }

        this.misc_graphics = this.add.graphics();

        this.text_particles = [];
        for (let i = 0; i < NUM_TEXT_PARTICLES; i++) {
            this.text_particles.push(this.add.text(W / 2, H / 2, 'TEXT', { font: `${F(192)}pt Covenant`, fill: '#ff9cf380', stroke: '#ff9cf3', strokeThickness: 4 }).setOrigin(0.5).setAlpha(0))
        }

        this.add.text(F(960), H - F(160), 'f1', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5);
        this.f_mids = [
            this.add.text(F(825), H - F(115), 'f2', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5),
            this.add.text(F(690), H - F(115), 'f3', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5),
            this.add.text(F(555), H - F(115), 'f4', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5)
        ];
        this.f_mids_draw = Array(N - 1).fill(0);
        this.add.text(F(420), H - F(160), 'f5', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5);
        this.f_misc = [
            this.add.text(F(690), H - F(60), 'fr', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5),
            this.add.text(F(690), H - F(60), 'fe', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5),
            this.add.text(F(690), H - F(60), 'foc', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5),
            this.add.text(F(690), H - F(60), 'fic', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5)
        ];
        this.f_misc_draw = Array(4).fill(0);
        this.warning = this.add.text(F(50), H - F(410), 'WARNING: IMMINENT FINALE  WARNING: IMMINENT FINALE  WARNING: IMMINENT FINALE  ', { font: `${F(72)}pt m3x6`, fill: '#ffffff' }).setAlpha(0);
        this.warning.setMask(field_mask);
        this.add.text(F(480), H - F(25), 'f1-f5:', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(1, 0.5);
        this.add.text(F(720), H - F(25), '\u00b5:', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(1, 0.5);
        {
            let offset = 15;
            this.add.polygon(0, 0, [
                F(395 + offset) - 0.5, F(102) - 0.5,
                F(390 + offset) - 0.5, F(102) - 0.5,
                F(390 + offset) - 0.5, F(177) - 0.5,
                F(395 + offset) - 0.5, F(177) - 0.5
            ]).setStrokeStyle(1, 0xf23af2).setOrigin(0).setClosePath(false);
            this.add.polygon(0, 0, [
                F(462 + offset), F(102) - 0.5,
                F(467 + offset), F(102) - 0.5,
                F(467 + offset), F(177) - 0.5,
                F(462 + offset), F(177) - 0.5
            ]).setStrokeStyle(1, 0xf23af2).setOrigin(0).setClosePath(false);
            this.rot4_rects = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    let rect = this.add.rectangle(F(390 + offset + 6 + 17 * i), F(100 + 7 + 17 * j), F(13), F(13), 0xffffff).setOrigin(0);
                    this.rot4_rects.push(rect);
                }
            }
            this.add.text(F(390 + offset), F(139), '4D rotate', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5, 1).setAngle(-90);

            const height = 15;
            this.add.text(F(500 + offset), F(95), 'zw:', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(1, 0.5);
            this.add.text(F(500 + offset), F(95 + 1 * height), 'xy:', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(1, 0.5);
            this.add.text(F(500 + offset), F(95 + 2 * height), 'yw:', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(1, 0.5);
            this.add.text(F(500 + offset), F(95 + 3 * height), 'zx:', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(1, 0.5);
            this.add.text(F(500 + offset), F(95 + 4 * height), 'zy:', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(1, 0.5);
            this.add.text(F(500 + offset), F(95 + 5 * height), 'xy2:', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(1, 0.5);
        }
        {
            let offset = 350;
            this.add.polygon(0, 0, [
                F(395 + offset) - 0.5, F(102) - 0.5,
                F(390 + offset) - 0.5, F(102) - 0.5,
                F(390 + offset) - 0.5, F(177) - 0.5,
                F(395 + offset) - 0.5, F(177) - 0.5
            ]).setStrokeStyle(1, 0xf23af2).setOrigin(0).setClosePath(false);
            this.add.polygon(0, 0, [
                F(462 + offset), F(102) - 0.5,
                F(467 + offset), F(102) - 0.5,
                F(467 + offset), F(177) - 0.5,
                F(462 + offset), F(177) - 0.5
            ]).setStrokeStyle(1, 0xf23af2).setOrigin(0).setClosePath(false);
            this.world_rects = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    let rect = this.add.rectangle(F(390 + offset + 6 + 17 * i), F(100 + 7 + 17 * j), F(13), F(13), 0xffffff).setOrigin(0);
                    this.world_rects.push(rect);
                }
            }
            this.add.text(F(390 + offset), F(139), '3D world inv', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5, 1).setAngle(-90);
        }
        {
            let offset = 470;
            this.add.polygon(0, 0, [
                F(395 + offset) - 0.5, F(102) - 0.5,
                F(390 + offset) - 0.5, F(102) - 0.5,
                F(390 + offset) - 0.5, F(177) - 0.5,
                F(395 + offset) - 0.5, F(177) - 0.5
            ]).setStrokeStyle(1, 0xf23af2).setOrigin(0).setClosePath(false);
            this.add.polygon(0, 0, [
                F(462 + offset), F(102) - 0.5,
                F(467 + offset), F(102) - 0.5,
                F(467 + offset), F(177) - 0.5,
                F(462 + offset), F(177) - 0.5
            ]).setStrokeStyle(1, 0xf23af2).setOrigin(0).setClosePath(false);
            this.proj_rects = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    let rect = this.add.rectangle(F(390 + offset + 6 + 17 * i), F(100 + 7 + 17 * j), F(13), F(13), 0xffffff).setOrigin(0);
                    this.proj_rects.push(rect);
                }
            }
            this.add.text(F(390 + offset - 2), F(139), '3D proj', { font: `${24 * FS}pt m3x6`, fill: '#f23af2' }).setOrigin(0.5, 1).setAngle(-90);
        }
        this.judge_texts = [
            this.add.text(F(210), H - F(300), 'great!', { font: `${36 * FS}pt Covenant`, fill: '#ffffff' }).setOrigin(0.5).setAlpha(0),
            this.add.text(F(210), H - F(300), 'good', { font: `${36 * FS}pt Covenant`, fill: '#ffffff' }).setOrigin(0.5).setAlpha(0),
            this.add.text(F(210), H - F(300), 'slow down...', { font: `${36 * FS}pt Covenant`, fill: '#ffffff' }).setOrigin(0.5).setAlpha(0)
        ]
        this.combo_text = this.add.text(F(210), F(470), 'COMBO', { font: `${12 * FS}pt Covenant`, fill: '#ffffff' }).setOrigin(0.5).setAlpha(0);

        this.combo_break_text = this.add.text(F(210), F(500), 'COMBO BREAK', { font: `${24 * FS}pt Covenant`, fill: '#ffbf00' }).setOrigin(0.5).setScale(0);

        this.finale_rect = this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setPostPipeline(FinaleFX);
        this.finale_rect_pipeline = this.finale_rect.getPostPipeline(FinaleFX);
        this.finale_rect_pipeline.saturation = 0.4;
        this.finale_rect_darken = this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0).setAlpha(0);


        this.convergence = this.add.text(W / 2, H / 2, 'CONVERGENCE', { font: `${128 * FS}pt Thaleah`, fill: '#ff9cf3', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.495, 0.7).setAlpha(0);
        this.old_words = Array(4).fill('');

        this.ending_graphics = this.add.graphics();

        this.ending_draw = [false, false, false];
        this.ending_texts = [
            this.add.text(F(400), F(300), 'Value', { font: `${36 * FS}pt Covenant`, fill: '#ffffff' }).setOrigin(1, 0.5),
            this.add.text(F(400), F(300 + 1 * 170), 'Score', { font: `${36 * FS}pt Covenant`, fill: '#ffffff' }).setOrigin(1, 0.5),
            this.add.text(F(400), F(300 + 2 * 170), 'Max Combo', { font: `${36 * FS}pt Covenant`, fill: '#ffffff' }).setOrigin(1, 0.5),
            this.add.text(W / 2, F(790), 'Z to play again', { font: `${36 * FS}pt Covenant`, fill: '#ffffff' }).setOrigin(0.5)
        ]
        this.ending_rotations = [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2];
        this.sound.pauseOnBlur = false;
        this.loop_thresholds = [
            0,
            Math.pow(1 / 7, 2),
            Math.pow(2 / 7, 2),
            Math.pow(3 / 7, 2),
            Math.pow(4 / 7, 2),
            Math.pow(5 / 7, 2),
            Math.pow(6 / 7, 2),
            Math.pow(6.5 / 7, 2),
        ];
        this.reinit();
        this.loading_text.destroy();
    }

    update(time, delta) {
        if (this.end_screen) {
            this.ending_graphics.clear();
            this.ending_graphics.lineStyle(3, 0xf23af2);
            if (this.ending_draw[0]) {
                this.ending_graphics.lineStyle(2, 0xf23af2);
                this.ending_graphics.fillStyle(0xf23af2);
                let y = F(300);
                for (let i = 0; i < 4; i++) {
                    let r = 40 + i * 20;
                    let x = F(600);
                    // ok this is the wrong vertex but by this point all the vertices should have converged within random error
                    let digits = balanced_ternary(this.moves[0].simplex[0][0][i], 8);
                    let width = 0.4 * (50 / r);
                    this.ending_rotations[i] += delta * 0.0005 * [7, 5, 3, 2][i];
                    let start = this.ending_rotations[i];
                    this.ending_graphics.beginPath();
                    this.ending_graphics.arc(x, y, F(r), start, start + digits.length * width);
                    this.ending_graphics.strokePath();
                    for (let j = 0; j < digits.length; j++) {
                        let cur_theta = start + width * (j + 0.5);
                        switch (digits[j]) {
                            case -1:
                                this.ending_graphics.lineBetween(x + Math.cos(cur_theta) * F(r), y + Math.sin(cur_theta) * F(r), x + Math.cos(cur_theta) * F(r - 9), y + Math.sin(cur_theta) * F(r - 9));
                                break;
                            case 0:
                                this.ending_graphics.strokeCircle(x + Math.cos(cur_theta) * F(r), y + Math.sin(cur_theta) * F(r), F(7));
                                break;
                            case 1:
                                this.ending_graphics.lineBetween(x + Math.cos(cur_theta) * F(r), y + Math.sin(cur_theta) * F(r), x + Math.cos(cur_theta) * F(r + 9), y + Math.sin(cur_theta) * F(r + 9));
                                break;
                            case 2:
                                this.ending_graphics.beginPath();
                                this.ending_graphics.moveTo(x + Math.cos(cur_theta) * F(r - 6), y + Math.sin(cur_theta) * F(r - 6));
                                this.ending_graphics.lineTo(x + Math.cos(cur_theta) * F(r) - Math.sin(cur_theta) * F(6), y + Math.sin(cur_theta) * F(r) + Math.cos(cur_theta) * F(6));
                                this.ending_graphics.lineTo(x + Math.cos(cur_theta) * F(r + 6), y + Math.sin(cur_theta) * F(r + 6));
                                this.ending_graphics.lineTo(x + Math.cos(cur_theta) * F(r) + Math.sin(cur_theta) * F(6), y + Math.sin(cur_theta) * F(r) - Math.cos(cur_theta) * F(6));
                                this.ending_graphics.closePath();
                                this.ending_graphics.fillPath();
                                break;
                        }
                    }
                }

                this.ending_graphics.lineBetween(F(800 - 25), y - F(10), F(800 - 25), y + F(10));
                this.ending_graphics.lineBetween(F(800 - 25), y, F(800 + 25), y);
                this.ending_graphics.lineBetween(F(800 + 15), y - F(10), F(800 + 25), y);
                this.ending_graphics.lineBetween(F(800 + 15), y + F(10), F(800 + 25), y);
                // draw f1
                {
                    let x = F(1000);
                    let digits = balanced_ternary(this.moves[0].f_simplex[0], 7);
                    let width = 20;
                    let start = -width / 2 * (digits.length - 1);
                    this.ending_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
                    for (let j = 0; j < digits.length; j++) {
                        switch (digits[j]) {
                            case -1:
                                this.ending_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(width));
                                break;
                            case 0:
                                this.ending_graphics.strokeCircle(x + F(start + width * j), y, F(width * 0.375));
                                break;
                            case 1:
                                this.ending_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(width));
                                break;
                            case 2:
                                this.ending_graphics.beginPath();
                                this.ending_graphics.moveTo(x + F(start + width * j) - F(width / 3), y);
                                this.ending_graphics.lineTo(x + F(start + width * j), y - F(width / 3));
                                this.ending_graphics.lineTo(x + F(start + width * j) + F(width / 3), y);
                                this.ending_graphics.lineTo(x + F(start + width * j), y + F(width / 3));
                                this.ending_graphics.closePath();
                                this.ending_graphics.fillPath();
                                break;
                        }
                    }
                }
            }
            if (this.ending_draw[1]) {
                this.ending_graphics.lineStyle(3, 0xffff00);
                let x = F(800);
                let y = F(300 + 1 * 170);
                let digits = balanced_ternary(this.score, 0);
                let width = 50;
                let start = -width / 2 * (digits.length - 1);
                this.ending_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
                for (let j = 0; j < digits.length; j++) {
                    switch (digits[j]) {
                        case -1:
                            this.ending_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(width));
                            break;
                        case 0:
                            this.ending_graphics.strokeCircle(x + F(start + width * j), y, F(width * 0.375));
                            break;
                        case 1:
                            this.ending_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(width));
                            break;
                    }
                }
            }
            if (this.ending_draw[2]) {
                this.ending_graphics.lineStyle(3, 0xffffff);
                let x = F(800);
                let y = F(300 + 2 * 170);
                let digits = balanced_ternary(this.max_combo, 0);
                let width = 50;
                let start = -width / 2 * (digits.length - 1);
                this.ending_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
                for (let j = 0; j < digits.length; j++) {
                    switch (digits[j]) {
                        case -1:
                            this.ending_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(width));
                            break;
                        case 0:
                            this.ending_graphics.strokeCircle(x + F(start + width * j), y, F(width * 0.375));
                            break;
                        case 1:
                            this.ending_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(width));
                            break;
                    }
                }
            }
            return;
        }

        this.three.tet_material.uniforms.uNoiseStrength.value = 0.05 + 0.10 * this.intensity + (this.finale ? 0.15 : 0);
        this.three.tet_material.uniforms.uTime.value += 0.001 * (0.2 + 2.8 * this.intensity + (this.finale ? 2 : 0)) * delta;

        if (!this.finale && !this.is_warning && this.intensity > 0.9) {
            this.is_warning = true;
            this.cameras.main.zoom = CAMERA_THUMP_ZOOM;
            this.camera_thump = this.tweens.add({
                targets: this.cameras.main,
                zoom: 1,
                loop: -1,
                duration: 1000,
                ease: 'Sine.easeOut',
            });
            this.warning.setAlpha(1);
        }
        if (this.is_warning && this.intensity < 0.85) {
            this.is_warning = false;
            this.cameras.main.zoom = 1;
            if (this.camera_thump) {
                this.camera_thump.remove();
            }
            this.warning.setAlpha(0);
        }
        if (this.is_warning) {
            this.warning_offset -= 2 * delta * (this.intensity - 0.8);
            if (this.warning_offset < -this.warning.displayWidth / 3) {
                this.warning_offset += this.warning.displayWidth / 3;
            }
            this.warning.setX(F(50) + this.warning_offset);
            this.warning.setTint(0xff0000 + 0x000100 * Math.max(0, Math.min(255, Math.floor(255 * (0.95 - this.intensity) / 0.1))));
        }

        background_ctx.fillRect(0, 0, 960, 720);
        this.potential = Math.min(this.potential + 0.001 * delta * (1 + 100 * Math.pow(this.intensity, 2)), 1);
        if (!this.climax) {
            this.field_graphics.clear();
            this.field_graphics.lineStyle(3, 0xdddd00);
            for (let i = 0; i < VISIBLE_MOVES; i++) {
                let m = this.moves[i].move;
                this.field_graphics.fillStyle([0xbb0000, 0x00bb00, 0x00bbbb, 0x0000dd][m]);
                let x = F(90 + 80 * m) - 0.5;
                let y = H - F(140 + (i + 1 - this.potential) * 90) - 0.5;
                this.field_graphics.lineStyle(2, 0x000000);
                this.field_graphics.fillRoundedRect(x - F(35), y - F(35), F(70), F(70), F(10));
                this.field_graphics.strokeRoundedRect(x - F(35), y - F(35), F(70), F(70), F(10));
                this.field_graphics.lineStyle(2, 0xffffff, 0.5);
                this.field_graphics.fillStyle(0xffffff, 0.5);
                switch (m) {
                    case 0:
                        this.field_graphics.beginPath();
                        this.field_graphics.moveTo(x + 5 * R2, y + 8 * R2);
                        this.field_graphics.lineTo(x + 15 * R2, y + 8 * R2);
                        this.field_graphics.lineTo(x + 15 * R2, y + 15 * R2);
                        this.field_graphics.lineTo(x + 30 * R2, y);
                        this.field_graphics.lineTo(x + 15 * R2, y + -15 * R2);
                        this.field_graphics.lineTo(x + 15 * R2, y + -8 * R2);
                        this.field_graphics.lineTo(x + 5 * R2, y + -8 * R2);
                        this.field_graphics.closePath();
                        this.field_graphics.fillPath();
                        this.field_graphics.beginPath();
                        this.field_graphics.moveTo(x - 5 * R2, y + 8 * R2);
                        this.field_graphics.lineTo(x - 15 * R2, y + 8 * R2);
                        this.field_graphics.lineTo(x - 15 * R2, y + 15 * R2);
                        this.field_graphics.lineTo(x - 30 * R2, y);
                        this.field_graphics.lineTo(x - 15 * R2, y + -15 * R2);
                        this.field_graphics.lineTo(x - 15 * R2, y + -8 * R2);
                        this.field_graphics.lineTo(x - 5 * R2, y + -8 * R2);
                        this.field_graphics.closePath();
                        this.field_graphics.fillPath();
                        break;
                    case 1:
                        this.field_graphics.lineBetween(x, y + 20 * R2, x, y - 20 * R2);
                        this.field_graphics.fillTriangle(x + 7 * R2, y, x + 25 * R2, y + 12 * R2, x + 25 * R2, y - 12 * R2);
                        this.field_graphics.fillTriangle(x - 7 * R2, y, x - 25 * R2, y + 12 * R2, x - 25 * R2, y - 12 * R2);
                        break;
                    case 2:
                        this.field_graphics.beginPath();
                        this.field_graphics.moveTo(x + (-30 + 2) * R2, y - 8 * R2);
                        this.field_graphics.lineTo(x + (-20 + 2) * R2, y - 8 * R2);
                        this.field_graphics.lineTo(x + (-20 + 2) * R2, y - 15 * R2);
                        this.field_graphics.lineTo(x + (-5 + 2) * R2, y);
                        this.field_graphics.lineTo(x + (-20 + 2) * R2, y + 15 * R2);
                        this.field_graphics.lineTo(x + (-20 + 2) * R2, y + 8 * R2);
                        this.field_graphics.lineTo(x + (-30 + 2) * R2, y + 8 * R2);
                        this.field_graphics.closePath();
                        this.field_graphics.fillPath();
                        this.field_graphics.beginPath();
                        this.field_graphics.moveTo(x - (-30 + 2) * R2, y - 8 * R2);
                        this.field_graphics.lineTo(x - (-20 + 2) * R2, y - 8 * R2);
                        this.field_graphics.lineTo(x - (-20 + 2) * R2, y - 15 * R2);
                        this.field_graphics.lineTo(x - (-5 + 2) * R2, y);
                        this.field_graphics.lineTo(x - (-20 + 2) * R2, y + 15 * R2);
                        this.field_graphics.lineTo(x - (-20 + 2) * R2, y + 8 * R2);
                        this.field_graphics.lineTo(x - (-30 + 2) * R2, y + 8 * R2);
                        this.field_graphics.closePath();
                        this.field_graphics.fillPath();
                        break;
                    case 3:
                        for (let [xm, ym] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
                            xm *= R2;
                            ym *= R2;
                            this.field_graphics.beginPath();
                            this.field_graphics.moveTo(x + 3 * xm, y + 3 * ym);
                            this.field_graphics.lineTo(x + 20 * xm, y + 3 * ym);
                            this.field_graphics.lineTo(x + 14 * xm, y + 8 * ym);
                            this.field_graphics.lineTo(x + 26 * xm, y + 20 * ym);
                            this.field_graphics.lineTo(x + 20 * xm, y + 26 * ym);
                            this.field_graphics.lineTo(x + 8 * xm, y + 14 * ym);
                            this.field_graphics.lineTo(x + 3 * xm, y + 20 * ym);
                            this.field_graphics.closePath();
                            this.field_graphics.fillPath();
                        }
                        break;
                }

                if (this.moves[i].mult > 1) {
                    let digits = balanced_ternary(this.moves[i].mult, 0);
                    let start = -7.5 * (digits.length - 1);
                    this.field_graphics.lineStyle(5, 0xcccc00);
                    this.field_graphics.lineBetween(x - F(30) - 1, y, x + F(30) + 1, y);
                    for (let j = 0; j < digits.length; j++) {
                        switch (digits[j]) {
                            case -1:
                                this.field_graphics.lineBetween(x + F(start + 15 * j), y, x + F(start + 15 * j), y + F(20) + 1);
                                break;
                            case 0:
                                this.field_graphics.strokeCircle(x + F(start + 15 * j), y, F(6));
                                break;
                            case 1:
                                this.field_graphics.lineBetween(x + F(start + 15 * j), y, x + F(start + 15 * j), y - F(20) - 1);
                                break;
                        }
                    }
                    this.field_graphics.lineStyle(3, 0xeeee00);
                    this.field_graphics.lineBetween(x - F(30), y, x + F(30), y);
                    for (let j = 0; j < digits.length; j++) {
                        switch (digits[j]) {
                            case -1:
                                this.field_graphics.lineBetween(x + F(start + 15 * j), y, x + F(start + 15 * j), y + F(20));
                                break;
                            case 0:
                                this.field_graphics.strokeCircle(x + F(start + 15 * j), y, F(6));
                                break;
                            case 1:
                                this.field_graphics.lineBetween(x + F(start + 15 * j), y, x + F(start + 15 * j), y - F(20));
                                break;
                        }
                    }
                }
            }
        }
        this.score_draw += 0.01 * delta * (this.score - this.score_draw);
        this.misc_graphics.clear();
        // draw score
        this.misc_graphics.lineStyle(2, 0xdddd00);
        {
            let x = W - F(100);
            let y = H - F(20);
            let digits = balanced_ternary(this.score_draw, 0);
            let width = 15;
            let start = -width / 2 * (digits.length - 1);
            this.misc_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
            for (let j = 0; j < digits.length; j++) {
                switch (digits[j]) {
                    case -1:
                        this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(15));
                        break;
                    case 0:
                        this.misc_graphics.strokeCircle(x + F(start + width * j), y, F(5));
                        break;
                    case 1:
                        this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(15));
                        break;
                }
            }
        }
        this.misc_graphics.lineStyle(2, 0xffffff);
        // draw max combo
        {
            let x = W - F(100);
            let y = H - F(75);
            let digits = balanced_ternary(this.max_combo, 0);
            let width = 15;
            let start = -width / 2 * (digits.length - 1);
            this.misc_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
            for (let j = 0; j < digits.length; j++) {
                switch (digits[j]) {
                    case -1:
                        this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(15));
                        break;
                    case 0:
                        this.misc_graphics.strokeCircle(x + F(start + width * j), y, F(5));
                        break;
                    case 1:
                        this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(15));
                        break;
                }
            }
        }
        // draw cur combo
        {
            if (!this.finale && this.cur_combo > 1) {
                let x = F(210);
                let y = F(500);
                let digits = balanced_ternary(this.cur_combo, 0);
                let width = 15;
                let start = -width / 2 * (digits.length - 1);
                this.misc_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
                for (let j = 0; j < digits.length; j++) {
                    switch (digits[j]) {
                        case -1:
                            this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(15));
                            break;
                        case 0:
                            this.misc_graphics.strokeCircle(x + F(start + width * j), y, F(5));
                            break;
                        case 1:
                            this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(15));
                            break;
                    }
                }
            }
        }
        /*this.misc_graphics.lineStyle(2, 0xffff00);
        // draw gained points
        {
            if (!this.finale && this.draw_points > 0) {
                let x = F(210);
                let y = F(360);
                let digits = balanced_ternary(this.draw_points, 0);
                let width = 15;
                let start = -width / 2 * (digits.length - 1);
                this.misc_graphics.lineBetween(x + F(start - 23), y, x + F(start - 37), y);
                this.misc_graphics.lineBetween(x + F(start - 30), y + F(7), x + F(start - 30), y - F(7));

                this.misc_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
                for (let j = 0; j < digits.length; j++) {
                    switch (digits[j]) {
                        case -1:
                            this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(15));
                            break;
                        case 0:
                            this.misc_graphics.strokeCircle(x + F(start + width * j), y, F(5));
                            break;
                        case 1:
                            this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(15));
                            break;
                    }
                }
            }
        }
        // draw mult
        {
            if (!this.finale && this.draw_mult > 1) {
                let x = F(210);
                let y = F(400);
                let digits = balanced_ternary(this.draw_mult, 0);
                let width = 15;
                let start = -width / 2 * (digits.length - 1);
                this.misc_graphics.lineBetween(x + F(start - 23), y + F(7), x + F(start - 37), y - F(7));
                this.misc_graphics.lineBetween(x + F(start - 23), y - F(7), x + F(start - 37), y + F(7));

                this.misc_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
                for (let j = 0; j < digits.length; j++) {
                    switch (digits[j]) {
                        case -1:
                            this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(15));
                            break;
                        case 0:
                            this.misc_graphics.strokeCircle(x + F(start + width * j), y, F(5));
                            break;
                        case 1:
                            this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(15));
                            break;
                    }
                }
            }
        }*/
        // draw finale bonus
        if (this.finale) {
            this.finale_bonus_draw += 0.01 * delta * (this.finale_bonus - this.finale_bonus_draw);
            {
                let x = F(210);
                let y = F(550);
                let digits = balanced_ternary(this.finale_bonus_draw, 0);
                let width = 15;
                let start = -width / 2 * (digits.length - 1);
                {
                    this.misc_graphics.lineStyle(5, 0x000000);
                    this.misc_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2) - 1, y, x + F(digits.length * width / 2 + width / 2) + 1, y);
                    for (let j = 0; j < digits.length; j++) {
                        switch (digits[j]) {
                            case -1:
                                this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(15) + 1);
                                break;
                            case 0:
                                this.misc_graphics.strokeCircle(x + F(start + width * j), y, F(5));
                                break;
                            case 1:
                                this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(15) - 1);
                                break;
                        }
                    }
                }
                {
                    this.misc_graphics.lineStyle(3, 0xeeee00);
                    this.misc_graphics.lineBetween(x - F(digits.length * width / 2 + width / 2), y, x + F(digits.length * width / 2 + width / 2), y);
                    for (let j = 0; j < digits.length; j++) {
                        switch (digits[j]) {
                            case -1:
                                this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y + F(15));
                                break;
                            case 0:
                                this.misc_graphics.strokeCircle(x + F(start + width * j), y, F(5));
                                break;
                            case 1:
                                this.misc_graphics.lineBetween(x + F(start + width * j), y, x + F(start + width * j), y - F(15));
                                break;
                        }
                    }
                }
            }
        }

        this.misc_graphics.lineStyle(1, 0xf23af2);
        this.misc_graphics.fillStyle(0xf23af2);
        {
            let xlo = F(420);
            let xhi = F(960);
            let y = H - F(80) - 0.5;
            let f1 = this.moves[0].f_simplex[0];
            let fn1 = this.moves[0].f_simplex[N];
            this.f1_draw += 0.01 * delta * (f1 - this.f1_draw);
            this.fn1_draw += 0.01 * delta * (fn1 - this.fn1_draw);
            for (let i = 1; i < N; i++) {
                let target = (this.moves[0].f_simplex[i] - fn1) / (f1 - fn1);
                this.f_mids_draw[i - 1] += 0.01 * delta * (target - this.f_mids_draw[i - 1]);
                let x = xlo + (xhi - xlo) * this.f_mids_draw[i - 1];
                this.f_mids[i - 1].setX(x);
                this.misc_graphics.fillTriangle(x, y, x + 6 * R2, y - 12 * R2, x - 6 * R2, y - 12 * R2);
            }
            let fs = [this.moves[0].fr, this.moves[0].fe, this.moves[0].foc, this.moves[0].fic];
            let num_left = 0;
            let num_right = 0;
            let cur_left = 0;
            let cur_right = 0;
            for (let i = 0; i < 4; i++) {
                let target = (fs[i] - fn1) / (f1 - fn1);
                this.f_misc_draw[i] += 0.01 * delta * (target - this.f_misc_draw[i]);
                if (this.f_misc_draw[i] < 0) {
                    num_left++;
                }
                if (this.f_misc_draw[i] > 1) {
                    num_right++;
                }
            }
            if (num_left > 0) {
                this.misc_graphics.fillTriangle(xlo - (6 + 20) * R2, y + 6 * R2, xlo - (18 + 20) * R2, y, xlo - (6 + 20) * R2, y - 6 * R2);
            }
            if (num_right > 0) {
                this.misc_graphics.fillTriangle(xhi + (6 + 20) * R2, y + 6 * R2, xhi + (18 + 20) * R2, y, xhi + (6 + 20) * R2, y - 6 * R2);
            }
            for (let i = 0; i < 4; i++) {
                if (0 <= this.f_misc_draw[i] && this.f_misc_draw[i] <= 1) {
                    let x = xlo + (xhi - xlo) * this.f_misc_draw[i];
                    this.f_misc[i].setPosition(x, y + F(24));
                    this.misc_graphics.fillTriangle(x, y, x + 6 * R2, y + 12 * R2, x - 6 * R2, y + 12 * R2);
                } else if (this.f_misc_draw[i] < 0) {
                    this.f_misc[i].setPosition(xlo - F(15), y - F(5 - 15 * (cur_left - num_left / 2 + 0.5)));
                    cur_left++;
                } else {
                    this.f_misc[i].setPosition(xhi + F(15), y - F(5 - 15 * (cur_right - num_right / 2 + 0.5)));
                    cur_right++;
                }
            }

            this.misc_graphics.lineBetween(xlo, y, xhi, y);
            {
                let x = xlo;
                let digits = balanced_ternary(this.f1_draw, 5);
                let width = -10;
                let start = -width * (digits.length - 6);
                this.misc_graphics.lineBetween(x, y - F(digits.length * width / 2 + width / 2), x, y + F(digits.length * width / 2 + width / 2));
                for (let j = 0; j < digits.length; j++) {
                    let cur_y = y + F(start + width * j);
                    switch (digits[j]) {
                        case -1:
                            this.misc_graphics.lineBetween(x, cur_y, x + F(10), cur_y);
                            break;
                        case 0:
                            this.misc_graphics.strokeCircle(x, cur_y, F(3));
                            break;
                        case 1:
                            this.misc_graphics.lineBetween(x, cur_y, x - F(10), cur_y);
                            break;
                        case 2:
                            this.misc_graphics.beginPath();
                            this.misc_graphics.moveTo(x - F(3), cur_y);
                            this.misc_graphics.lineTo(x, cur_y - F(3));
                            this.misc_graphics.lineTo(x + F(3), cur_y);
                            this.misc_graphics.lineTo(x, cur_y + F(3));
                            this.misc_graphics.closePath();
                            this.misc_graphics.fillPath();
                            break;
                    }
                }
            }
            {
                let x = xhi;
                let digits = balanced_ternary(this.fn1_draw, 5);
                let width = 10;
                let start = -width * (digits.length - 6);
                this.misc_graphics.lineBetween(x, y - F(digits.length * width / 2 + width / 2), x, y + F(digits.length * width / 2 + width / 2));
                for (let j = 0; j < digits.length; j++) {
                    let cur_y = y + F(start + width * j);
                    switch (digits[j]) {
                        case -1:
                            this.misc_graphics.lineBetween(x, cur_y, x - F(10), cur_y);
                            break;
                        case 0:
                            this.misc_graphics.strokeCircle(x, cur_y, F(3));
                            break;
                        case 1:
                            this.misc_graphics.lineBetween(x, cur_y, x + F(10), cur_y);
                            break;
                        case 2:
                            this.misc_graphics.beginPath();
                            this.misc_graphics.moveTo(x - F(3), cur_y);
                            this.misc_graphics.lineTo(x, cur_y - F(3));
                            this.misc_graphics.lineTo(x + F(3), cur_y);
                            this.misc_graphics.lineTo(x, cur_y + F(3));
                            this.misc_graphics.closePath();
                            this.misc_graphics.fillPath();
                            break;

                    }
                }
            }
        }
        this.range_draw += 0.01 * delta * ((this.moves[0].f_simplex[0] - this.moves[0].f_simplex[N]) - this.range_draw);
        {
            let xlo = F(490);
            let xhi = F(690);
            let y = H - F(18) - 0.5;
            this.misc_graphics.lineBetween(xlo, y, xhi, y);
            let digits = balanced_ternary(this.range_draw, 14);
            let width = 10;
            let start = -width * (digits.length - 9);
            for (let j = 0; j < digits.length; j++) {
                let cur_x = (xlo + xhi) / 2 + F(start + width * j);
                switch (digits[j]) {
                    case -1:
                        this.misc_graphics.lineBetween(cur_x, y, cur_x, y + F(10));
                        break;
                    case 0:
                        this.misc_graphics.strokeCircle(cur_x, y, F(3));
                        break;
                    case 1:
                        this.misc_graphics.lineBetween(cur_x, y, cur_x, y - F(10));
                        break;
                    case 2:
                        this.misc_graphics.beginPath();
                        this.misc_graphics.moveTo(cur_x - F(3), y);
                        this.misc_graphics.lineTo(cur_x, y - F(3));
                        this.misc_graphics.lineTo(cur_x + F(3), y);
                        this.misc_graphics.lineTo(cur_x, y + F(3));
                        this.misc_graphics.closePath();
                        this.misc_graphics.fillPath();
                        break;

                }
            }
        }
        this.mean_draw += 0.01 * delta * (this.moves[0].f_simplex.reduce((a, b) => a + b, 0) / (N + 1) - this.mean_draw);
        {
            let xlo = F(730);
            let xhi = F(930);
            let y = H - F(18) - 0.5;
            this.misc_graphics.lineBetween(xlo, y, xhi, y);
            let digits = balanced_ternary(this.mean_draw, 13);
            let width = 10;
            let start = -width * (digits.length - 10);
            for (let j = 0; j < digits.length; j++) {
                let cur_x = (xlo + xhi) / 2 + F(start + width * j);
                switch (digits[j]) {
                    case -1:
                        this.misc_graphics.lineBetween(cur_x, y, cur_x, y + F(10));
                        break;
                    case 0:
                        this.misc_graphics.strokeCircle(cur_x, y, F(3));
                        break;
                    case 1:
                        this.misc_graphics.lineBetween(cur_x, y, cur_x, y - F(10));
                        break;
                    case 2:
                        this.misc_graphics.beginPath();
                        this.misc_graphics.moveTo(cur_x - F(3), y);
                        this.misc_graphics.lineTo(cur_x, y - F(3));
                        this.misc_graphics.lineTo(cur_x + F(3), y);
                        this.misc_graphics.lineTo(cur_x, y + F(3));
                        this.misc_graphics.closePath();
                        this.misc_graphics.fillPath();
                        break;
                }
            }
        }

        if (!this.finale) {
            // intensity decay
            this.intensity = Math.max(this.intensity - 0.000025 * this.intensity * delta, 0);
        }
        this.intensity_smooth += (this.intensity - this.intensity_smooth) * delta * 0.005;
        this.intensity_mask.height = (1 - this.intensity_smooth) * (H - F(200) - 2);
        this.potential_mask.height = (1 - this.potential) * (H - F(700) - 2);

        if (!this.finale) {
            for (let i = 0; i < this.loops.length; i++) {
                this.loops[i].setVolume((Math.max(VOLUME_EPSILON, Math.min(1,
                    (this.intensity_smooth - this.loop_thresholds[i]) / (this.loop_thresholds[i + 1] - this.loop_thresholds[i])
                ))));
            }
        }

        this.wikipedia_y = (this.wikipedia_y - delta * R2 * (0.01 + 0.19 * Math.pow(this.intensity, 4))) % (this.wikipedia.height + F(100));
        this.wikipedia.y = this.wikipedia_y - F(5) + (95);

        this.three.r_zw += 1.13 * 0.00005 * delta * (1 + 4 * this.intensity);
        this.three.r_xy += 1.11 * 0.00005 * delta * (1 + 4 * this.intensity);
        this.three.r_yw += 1.07 * 0.00005 * delta * (1 + 4 * this.intensity);
        this.three.r_zx += 1.05 * 0.00005 * delta * (1 + 4 * this.intensity);
        this.three.r_zy += 1.03 * 0.00005 * delta * (1 + 4 * this.intensity);
        this.three.r_xy2 += 1.02 * 0.00005 * delta * (1 + 4 * this.intensity);
        if (this.three.r_zw > 2 * Math.PI) {
            this.three.r_zw -= 2 * Math.PI;
        }
        if (this.three.r_xy > 2 * Math.PI) {
            this.three.r_xy -= 2 * Math.PI;
        }
        if (this.three.r_yw > 2 * Math.PI) {
            this.three.r_yw -= 2 * Math.PI;
        }
        if (this.three.r_zx > 2 * Math.PI) {
            this.three.r_zx -= 2 * Math.PI;
        }
        if (this.three.r_zy > 2 * Math.PI) {
            this.three.r_zy -= 2 * Math.PI;
        }
        if (this.three.r_xy2 > 2 * Math.PI) {
            this.three.r_xy2 -= 2 * Math.PI;
        }

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
            cos(this.three.r_xy2), -sin(this.three.r_xy2), 0, 0,
            sin(this.three.r_xy2), cos(this.three.r_xy2), 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
        this.three.r1.multiply(this.three.r2);
        this.three.r1.multiply(this.three.r3);
        this.three.r1.multiply(this.three.r4);
        // NOTE: no idea if matrices need to be transposed or order of mult needs to be reversed...
        {
            let values = [
                this.three.r_zw,
                this.three.r_xy,
                this.three.r_yw,
                this.three.r_zx,
                this.three.r_zy,
                this.three.r_xy2];
            let xlo = F(500 + 20);
            let xhi = F(680 + 20);
            for (let i = 0; i < 6; i++) {
                let y = F(103 + 15 * i) - 0.5;
                this.misc_graphics.lineBetween(xlo, y, xhi, y);
                let digits = balanced_ternary(values[i], 13);
                let width = 10;
                let start = -width * (digits.length - 9);
                for (let j = 0; j < digits.length; j++) {
                    let cur_x = (xlo + xhi) / 2 + F(start + width * j);
                    switch (digits[j]) {
                        case -1:
                            this.misc_graphics.lineBetween(cur_x, y, cur_x, y + F(7));
                            break;
                        case 0:
                            this.misc_graphics.strokeCircle(cur_x, y, F(3));
                            break;
                        case 1:
                            this.misc_graphics.lineBetween(cur_x, y, cur_x, y - F(7));
                            break;
                        case 2:
                            this.misc_graphics.beginPath();
                            this.misc_graphics.moveTo(cur_x - F(3), y);
                            this.misc_graphics.lineTo(cur_x, y - F(3));
                            this.misc_graphics.lineTo(cur_x + F(3), y);
                            this.misc_graphics.lineTo(cur_x, y + F(3));
                            this.misc_graphics.closePath();
                            this.misc_graphics.fillPath();
                            break;
                    }
                }
            }
        }
        for (let i = 0; i < N + 1; i++) {
            let [v, id] = this.moves[0].simplex[i];
            this.three.vert_vec4s[id].fromArray(v);
            this.three.vert_vec4s[id].applyMatrix4(this.three.r1);
            v_smooth(this.three.vertices[id].position, this.three.vert_vec4s[id], delta * 0.005);
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
            this.three.vertex_mats[i].color.lerp(this.three.vertex_colors[i], 0.005 * delta);
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

        for (let i = 0; i < 16; i++) {
            let value = Math.max(-1, Math.min(1, this.three.r1.elements[i]));
            if (value > 0) {
                this.rot4_rects[i].setFillStyle(0xaa00ff, value);
            } else {
                this.rot4_rects[i].setFillStyle(0xffaa00, -value);
            }
        }
        for (let i = 0; i < 16; i++) {
            let value = Math.max(-1, Math.min(1, this.three.camera.matrixWorldInverse.elements[i]));
            if (value > 0) {
                this.world_rects[i].setFillStyle(0xaa00ff, value);
            } else {
                this.world_rects[i].setFillStyle(0xffaa00, -value);
            }
        }
        for (let i = 0; i < 16; i++) {
            let value = Math.max(-1, Math.min(1, this.three.camera.projectionMatrix.elements[i]));
            if (value > 0) {
                this.proj_rects[i].setFillStyle(0xaa00ff, value);
            } else {
                this.proj_rects[i].setFillStyle(0xffaa00, -value);
            }
        }

        for (let i = 0; i < 4; i++) {
            this.receptors[i].setScale(this.receptors[i].scale + 0.01 * delta * (1 - this.receptors[i].scale));
            this.flashes[i].setScale(this.flashes[i].scale + 0.01 * delta * (1.5 - this.flashes[i].scale));
            this.flashes[i].setAlpha(this.flashes[i].alpha + 0.01 * delta * (0 - this.flashes[i].alpha));
        }
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
        scene: [Title, Play],
        transparent: true,
        pipeline: [FinaleFX]
        /*scale: {
            autoCenter: Phaser.Scale.CENTER_BOTH
        }*/
    };
    const game = new Phaser.Game(config);
}

main();