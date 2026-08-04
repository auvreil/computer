window.AppRegistry = [];

function registerApp(app){
  // app: { id, name, icon, showOnDesktop (bool), launch(ctx) }
  window.AppRegistry.push(app);
}

function getApp(id){
  return window.AppRegistry.find(a => a.id === id);
}
