require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const response = require('./utils/response');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const ingredientRoutes = require('./routes/ingredients');
const inventoryRoutes = require('./routes/inventory');
const inboundRoutes = require('./routes/inbounds');
const outboundRoutes = require('./routes/outbounds');
const stocktakeRoutes = require('./routes/stocktakes');
const supplierRoutes = require('./routes/suppliers');
const warningRoutes = require('./routes/warnings');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inbounds', inboundRoutes);
app.use('/api/outbounds', outboundRoutes);
app.use('/api/stocktakes', stocktakeRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/warnings', warningRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json(response.success({ status: 'ok' }));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    console.log('数据库连接成功');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('模型同步完成');
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  })
  .catch(err => {
    console.error('启动失败:', err.message);
    process.exit(1);
  });

module.exports = app;
