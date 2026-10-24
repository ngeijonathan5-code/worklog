const express = require('express');
const app = express();
app.use(express.json());

const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

app.listen(3002, () => {
  console.log('Test server running on 3002');
  
  // Check routes
  app._router.stack.forEach(layer => {
    if (layer.route) {
      console.log('Route:', layer.route.path, Object.keys(layer.route.methods));
    } else if (layer.name === 'router') {
      console.log('Sub-router at:', layer.regexp);
      layer.handle.stack.forEach(s => {
        if (s.route) console.log('  ->', s.route.path, Object.keys(s.route.methods));
      });
    }
  });
});