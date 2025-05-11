// animate.js

window.animate = function(){
    requestAnimationFrame(animate);
    const t = performance.now()*0.001;
    if (window.currentVisualizer && currentVisualizer.update){
        currentVisualizer.update(t);
    }
    renderer.render(scene, camera);
};

// respond to resize
window.addEventListener('resize', ()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
