const db = require("../util/database");
const DetailProduct = require("../models/detail-product");
const Response = require("../models/response");
const { Guid } = require("js-guid");
const {
  getDetailProductCart,
  updateOrAddProductCart,
  deleteProductCart,
} = require("./product-cart");

//khai báo các biến toàn cục dùng chung
const tableName = "cart";
const tableNameReference = "product_cart";
const primaryKeyTable = "CartId";

//#region API function - service
/**
 * Lấy chi tiết toàn bộ giỏ hàng
 * Cho phép lọc theo Mã khách hàng và Mã cửa hàng
 * @param {*} req request
 * @param {*} res response
 * @param {*} next next sang middleware khác
 */
const getCarts = async (req, res, next) => {
  const shopCode = req.query.shopCode;
  const customerCode = req.query.customerCode;
  let sql = `select distinct c1.${primaryKeyTable} from ${tableName} c1 `;
  if (customerCode) {
    sql += `inner join ${tableName} c2 on c1.CustomerCode like '%${customerCode}%' `;
  }
  if (shopCode) {
    sql += `inner join ${tableName} c3 on c1.ShopCode = '${shopCode}' `;
  }
  try {
    let result = [];
    const listCartId = await db.execute(sql);
    await Promise.all(
      listCartId[0].map(async (item) => {
        const productCart = await getProductsByCart(item.CartId);
        const detailProduct = new DetailProduct(
          productCart.ProductId,
          productCart.ProductCode,
          productCart.ProductName,
          productCart.Description,
          productCart.ImageUrl,
          productCart.ImportPrice,
          productCart.PurchasePrice,
          productCart.Amount,
          productCart.QuantitySold,
          productCart.DateOfImport,
          productCart.Rating,
          productCart.Sale,
          productCart.ShopId,
          productCart.CategoryId,
          productCart.CartId,
          "",
          productCart.ProductAmount,
          productCart.ProductPrice
        );
        result.push(detailProduct);
      })
    );
    if (result.length > 0) {
      res.send(
        new Response(
          (isSuccess = true),
          (errorCode = null),
          (devMsg = `Get list cart success.`),
          (userMsg = `Lấy danh sách giỏ hàng thành công.`),
          (moreInfo = null),
          (data = result)
        )
      );
    } else {
      res.send(
        new Response(
          (isSuccess = true),
          (errorCode = null),
          (devMsg = `Does not exist list product in cart.`),
          (userMsg = `Không tồn tại danh sách sản phẩm trong giỏ hàng cần tìm.`),
          (moreInfo = null),
          (data = null)
        )
      );
    }
  } catch (err) {
    res.send(
      new Response(
        (isSuccess = false),
        (errorCode = "DB001"),
        (devMsg = err.toString()),
        (userMsg = "Lỗi lấy dữ liệu từ cơ sở dữ liệu"),
        (moreInfo = null),
        (data = null)
      )
    );
  }
};

/**
 * Lấy chi tiết giỏ hàng theo id giỏ hàng
 * @param {*} req request
 * @param {*} res response
 * @param {*} next next sang middleware khác
 */
const getDetailCartById = async (req, res, next) => {
  const cartId = req.params.cartId;
  console.log(cartId);
  if (cartId) {
    try {
      const result = await getProductsByCart(cartId);
      if (result) {
        const detailProduct = new DetailProduct(
          result.ProductId,
          result.ProductCode,
          result.ProductName,
          result.Description,
          result.ImageUrl,
          result.ImportPrice,
          result.PurchasePrice,
          result.Amount,
          result.QuantitySold,
          result.DateOfImport,
          result.Rating,
          result.Sale,
          result.ShopId,
          result.CategoryId,
          result.CartId,
          "",
          result.ProductAmount,
          result.ProductPrice
        );
        res.send(
          new Response(
            (isSuccess = true),
            (errorCode = null),
            (devMsg = `Get detail cart with id = '${cartId}' success.`),
            (userMsg = `Lấy chi tiết giỏ hàng có id = '${cartId}' thành công.`),
            (moreInfo = null),
            (data = detailProduct)
          )
        );
      } else {
        res.send(
          new Response(
            (isSuccess = true),
            (errorCode = null),
            (devMsg = `Does not exist cart with id = '${cartId}' in database.`),
            (userMsg = `Không tồn tại giỏ hàng có id = '${cartId}' trong cơ sở dữ liệu.`),
            (moreInfo = null),
            (data = null)
          )
        );
      }
    } catch (err) {
      res.send(
        new Response(
          (isSuccess = false),
          (errorCode = "DB001"),
          (devMsg = err.toString()),
          (userMsg = "Lỗi lấy dữ liệu từ cơ sở dữ liệu"),
          (moreInfo = null),
          (data = null)
        )
      );
    }
  } else {
    res.send(
      new Response(
        (isSuccess = false),
        (errorCode = null),
        (devMsg = "Params in request is null"),
        (userMsg = null),
        (moreInfo = null),
        (data = null)
      )
    );
  }
};

/**
 * Thêm, cập nhật sản phẩm trong giỏ hàng
 * @param {*} req request
 * @param {*} res response
 * @param {*} next next sang middleware khác
 */
const addProductToCart = async (req, res, next) => {
  const cartId = req.body.cartId;
  const customerId = req.body.customerId;
  const shopId = req.body.shopId;
  const productId = req.body.productId;
  const productPrice = req.body.productPrice;
  const productAmount = req.body.productAmount;
  const costAdded = +productPrice * +productAmount;

  let result = null;
  //check dữ liệu đầu vào bắt buộc phải có
  if (customerId && shopId && productAmount && productPrice && productId) {
    try {
      if (cartId) {
        //check tồn tại
        const exitsCart = await getCartById(cartId);
        if (exitsCart) {
          const costAdded = +productPrice * +productAmount;
          result = await Promise.all([
            updateOrAddProductCart(
              cartId,
              productId,
              productAmount,
              productPrice
            ),
            updateTotalCart(cartId, costAdded),
          ]);
          res.send(
            new Response(
              (isSuccess = true),
              (errorCode = null),
              (devMsg = "Create cart success!"),
              (userMsg = "Cập nhật giỏ hàng thành công."),
              (moreInfo = null),
              (data = result)
            )
          );
        } else {
          res.send(
            new Response(
              (isSuccess = true),
              (errorCode = null),
              (devMsg = `Cannot found cart have id = '${cartId}' in the database.`),
              (userMsg = `Không tìm thấy giỏ hàng có id = '${cartId}'.`),
              (moreInfo = null),
              (data = null)
            )
          );
        }
      } else {
        const newCartId = await createCart(customerId, shopId, costAdded);
        result = await updateOrAddProductCart(
          newCartId,
          productId,
          productAmount,
          productPrice
        );
        res.send(
          new Response(
            (isSuccess = true),
            (errorCode = null),
            (devMsg = "Create cart success!"),
            (userMsg = "Tạo giỏ hàng thành công."),
            (moreInfo = null),
            (data = result)
          )
        );
      }
    } catch (err) {
      res.send(
        new Response(
          (isSuccess = false),
          (errorCode = "DB004"),
          (devMsg = err.toString()),
          (userMsg = "Lỗi thêm mới cơ sở dữ liệu"),
          (moreInfo = null),
          (data = null)
        )
      );
    }
  } else {
    res.send(
      new Response(
        (isSuccess = false),
        (errorCode = null),
        (devMsg = "Params in request is null"),
        (userMsg = null),
        (moreInfo = null),
        (data = null)
      )
    );
  }
};

/**
 * Xóa toàn bộ giỏ hàng, bao gồm tất cả sản phẩm trong giỏ
 * @param {*} req request
 * @param {*} res response
 * @param {*} next next sang middleware khác
 */
const deleteCart = async (req, res, next) => {
  const cartId = req.params.cartId;
  let result = null;
  if (cartId) {
    try {
      const sql = `delete from ${tableName} where ${primaryKeyTable} = "${cartId}"`;
      result = db.execute(sql);
      res.send(
        new Response(
          (isSuccess = true),
          (errorCode = null),
          (devMsg = "Delete cart success!"),
          (userMsg = "Xóa giỏ hàng thành công."),
          (moreInfo = null),
          (data = result)
        )
      );
    } catch (err) {
      res.send(
        new Response(
          (isSuccess = false),
          (errorCode = "DB003"),
          (devMsg = err.toString()),
          (userMsg = "Lỗi xóa dữ liệu trong cơ sở dữ liệu"),
          (moreInfo = null),
          (data = null)
        )
      );
    }
  } else {
    res.send(
      new Response(
        (isSuccess = false),
        (errorCode = null),
        (devMsg = "Params in request is null"),
        (userMsg = null),
        (moreInfo = null),
        (data = null)
      )
    );
  }
};

/**
 * Xóa 1 sản phẩm có trong giỏ hàng
 * @param {*} req request
 * @param {*} res response
 * @param {*} next next sang middleware khác
 */
const deleteProductInCart = async (req, res, next) => {
  console.log("deleteProductInCart");
  const cartId = req.query.cartId;
  const productId = req.query.productId;

  if (cartId && productId) {
    let result;
    try {
      const existProductCart = await getDetailProductCart(cartId, productId);
      if (existProductCart) {
        result = await deleteProductCart(existProductCart.Id);
        res.send(
          new Response(
            (isSuccess = true),
            (errorCode = null),
            (devMsg = null),
            (userMsg = null),
            (moreInfo = null),
            (data = result)
          )
        );
      } else {
        res.send(
          new Response(
            (isSuccess = false),
            (errorCode = null),
            (devMsg = `Cannot found product with id = '${productId}' in cart with id = '${productId}'`),
            (userMsg = `Không thể tìm thấy sản phẩm có id = '${productId}' trong giỏ hàng có id = '${productId}'`),
            (moreInfo = null),
            (data = null)
          )
        );
      }
    } catch (err) {
      res.send(
        new Response(
          (isSuccess = false),
          (errorCode = "DB003"),
          (devMsg = err.toString()),
          (userMsg = "Lỗi xóa dữ liệu trong cơ sở dữ liệu"),
          (moreInfo = null),
          (data = null)
        )
      );
    }
  } else {
    res.send(
      new Response(
        (isSuccess = false),
        (errorCode = null),
        (devMsg = "Params in request is null"),
        (userMsg = null),
        (moreInfo = null),
        (data = null)
      )
    );
  }
};

//#endregion

//#region Private Function
/**
 * Lấy danh sách sản phẩm có mã giỏ hàng
 * @param {*} cartId Mã giỏ hàng
 * @returns danh sách sản phẩm
 */
const getProductsByCart = async (cartId) => {
  //tạo câu lệnh sql tương ứng
  const sql = `select p.*, pc.ProductAmount, pc.ProductPrice, pc.CartId from product p, ${tableNameReference} pc where pc.CartId = '${cartId}' and p.ProductId = pc.ProductId;`;
  const result = await db.execute(sql);
  return result[0][0];
};

/**
 * Lấy thông tin chi tiết giỏ hàng bằng id
 * @param {*} cartId Mã giỏ hàng
 * @returns chi tiết giỏ hàng
 */
const getCartById = async (cartId) => {
  //tạo câu lệnh sql tương ứng
  const sql = `select * from ${tableName} where CartId = '${cartId}';`;
  //thực hiện tạo giỏ hàng mới
  const result = await db.execute(sql);
  return result[0][0];
};

/**
 * Tạo giỏ hàng rỗng mới
 * Mỗi khách hàng sẽ có nhiều giỏ hàng chưa thanh toán, mỗi giỏ hàng sẽ tương ứng với
 * @param {*} customerId Mã khách hàng
 * @param {*} shopId Mã cửa hàng
 * @param {*} total Tổng tiền hiện tại của giỏ
 * @returns kết quat tạo
 */
const createCart = async (customerId, shopId, total) => {
  const cartId = Guid.newGuid().toString();
  if (customerId && shopId && total && cartId) {
    //tạo câu lệnh sql tương ứng
    const sql = `insert into ${tableName} (CartId, CustomerId, Total, ShopId) values ('${cartId}', '${customerId}', '${total}', '${shopId}')`;
    //thực hiện tạo giỏ hàng mới
    const result = await db.execute(sql);
    if (result) {
      return cartId;
    } 
  }
  return null;
};

/**
 * Cập nhật tổng tiền giỏ hàng
 * Mỗi khi khách hàng thêm sản phẩm vào giỏ sẽ cập nhật là tổng tiền của giỏ hàng
 * @param {*} cartId Mã giỏ hàng
 * @param {*} costAdded Tiền thêm, bớt. (+) với trường hợp tăng, (-) với trường hợp giảm
 * @returns
 */
const updateTotalCart = async (cartId, costAdded) => {
  const cartOld = await getCartById(cartId);
  if (cartOld) {
    const total = +cartOld.Total + +costAdded;
    //tạo câu lệnh sql tương ứng
    let sql = `update ${tableName} set Total = '${total}' where CartId = '${cartId}';`;
    //thực hiện tạo giỏ hàng mới
    const result = await db.execute(sql);
    return result;
  } else return null;
};

//#endregion

//export controller
module.exports = {
  getCarts,
  getDetailCartById,
  addProductToCart,
  deleteCart,
  deleteProductInCart,
};
