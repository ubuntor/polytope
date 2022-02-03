const canvas = document.getElementById('canvas');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;    
}

function main() {
    resize();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

main();
