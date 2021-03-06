const express = require("express");
const customerRoutes = require('./src/routes/customers');
const productRoutes = require('./src/routes/products');
const adminRoutes = require('./src/routes/admins');
const shipperRoutes = require('./src/routes/shippers');
const shopRoutes = require('./src/routes/shops');
const categoryRoutes = require('./src/routes/categories');
const cartRoutes = require('./src/routes/carts');
const orderRoutes = require('./src/routes/orders');
const errorController = require('./src/controllers/error');
const cors = require('cors');

//Khai báo cấu hình, khai báo phải theo thứ tự, nhận môi trường theo cấu hình
process.env.NODE_ENV = 'development';
const config = require('./config/config');
 
//khởi tạo server
const app = express();

//Bỏ mã hóa cho response trả về, bỏ chặn cors
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());//bắt buộc phải có, nếu không req.body sẽ luôn trả về {}
app.use('/api',customerRoutes);
app.use('/api',productRoutes);
app.use('/api',adminRoutes);
app.use('/api',shipperRoutes);
app.use('/api',shopRoutes);
app.use('/api',categoryRoutes);
app.use('/api',cartRoutes);
app.use('/api',orderRoutes);
app.use(errorController.get404);


//Tạo địa chỉ Ip, cổng kết nối cho server
app.listen(config.node_port, config.node_ip, () => {
  console.log(`Server started on port : ${config.node_port}`);
});
