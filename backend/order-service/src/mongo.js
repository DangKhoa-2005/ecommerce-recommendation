const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URL || "mongodb://mongo:27017";
const dbName = process.env.MONGO_DB_NAME || "ecommerce";

let client;
let db;

const legacyMockNames = [
  "iPhone 15",
  "Samsung Galaxy S24",
  "MacBook Pro M3",
  "Sony WH-1000XM5"
];

const allowedCategories = [
  "cool_stuff",
  "relogios_presentes",
  "brinquedos",
  "bebes",
  "moveis_decoracao",
  "casa_conforto",
  "cama_mesa_banho"
];

const historicalOlistProducts = [
  {
    olist_product_id: "db12039c7ff4e850d48e0312fa9b3473",
    name: "Đèn LED Trang Trí Phòng",
    category: "cool_stuff",
    price: 500000,
    stock: 100,
    image_url: "https://plus.unsplash.com/premium_photo-1674670903819-8983675fe386?q=80&w=1170&auto=format&fit=crop"
  },
  {
    olist_product_id: "094efc8b088034585ebda1a32da7181d",
    name: "Thú Nhồi Bông Bạch Tuộc",
    category: "brinquedos",
    price: 719000,
    stock: 100,
    image_url: "https://images.unsplash.com/photo-1671043119167-d1b8f88a88c6?q=80&w=881&auto=format&fit=crop"
  },
  {
    olist_product_id: "423b46d7ff817b1cd19ab195c7b76546",
    name: "Đồng Hồ Quà Tặng Thanh Lịch",
    category: "relogios_presentes",
    price: 550000,
    stock: 100,
    image_url: "https://images.unsplash.com/photo-1616928231359-fc8b7e244c3b?q=80&w=764&auto=format&fit=crop"
  },
  {
    olist_product_id: "756791c03bd72f60ad98162dd69d054c",
    name: "Mô hình Xe Đồ Chơi Mini",
    category: "brinquedos",
    price: 1049000,
    stock: 100,
    image_url: "https://images.unsplash.com/photo-1696824711591-018c23ff9248?q=80&w=1170&auto=format&fit=crop"
  },
  {
    olist_product_id: "b623b7cb05ee3248fbe4a6ecbeed79a4",
    name: "Đồ Chơi Lắp Ghép Sáng Tạo",
    category: "brinquedos",
    price: 749000,
    stock: 100,
    image_url: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=1170&auto=format&fit=crop"
  }
];

function buildProducts(category, items) {
  return items.map((item) => ({
    category,
    ...item
  }));
}

function normalizeProductId(productId) {
  const value = String(productId || '').trim();
  if (!value) return value;
  return value.length > 24 ? value.slice(0, 24) : value;
}

const olistTopProducts = [
  ...buildProducts("cool_stuff", [
    {
      olist_product_id: "86513cbf63bb505ec42c62b661324672",
      name: "Tai nghe chụp tai không dây",
      price: 499000,
      stock: 48,
      image_url: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&auto=format&fit=crop"
    },
    {
      olist_product_id: "f175811ea0e0a865f56125dfbb04a8a6",
      name: "Loa Bluetooth Mini",
      price: 689000,
      stock: 36,
      image_url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=1631&auto=format&fit=crop"
    },
    {
      olist_product_id: "542b3d80712d51eefe3a3cd1c5f4e8fe",
      name: "Kính mát thời trang",
      price: 899000,
      stock: 51,
      image_url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=880&auto=format&fit=crop"
    },
    {
      olist_product_id: "1a00358b2af8b1c79f570a0e0ceb2208",
      name: "Máy chơi game cầm tay",
      price: 349000,
      stock: 64,
      image_url: "https://images.unsplash.com/photo-1604586376807-f73185cf5867?q=80&w=1170&auto=format&fit=crop"
    },
    {
      olist_product_id: "21a3fd0dcc50f6c1dbd01c2faf1db393",
      name: "Chuột máy tính gaming",
      price: 1299000,
      stock: 22,
      image_url: "https://images.unsplash.com/photo-1629121291243-7b5e885cce9b?q=80&w=764&auto=format&fit=crop"
    }
  ]),
  ...buildProducts("relogios_presentes", [
    {
      olist_product_id: "f194a56fe15513535bd5b51e2f7086c3",
      name: "Đồng hồ nam dây da",
      price: 759000,
      stock: 44,
      image_url: "https://images.unsplash.com/photo-1619134778706-7015533a6150?q=80&w=1170&auto=format&fit=crop"
    },
    {
      olist_product_id: "f2dd3514de2473108a6e631aa3f87905",
      name: "Đồng hồ nữ kim loại",
      price: 829000,
      stock: 38,
      image_url: "https://images.unsplash.com/photo-1549972574-8e3e1ed6a347?q=80&w=880&auto=format&fit=crop"
    },
    {
      olist_product_id: "1c756cc8c5e3b4a2fcf83d1690f8084d",
      name: "Đồng Hồ Thông Minh",
      price: 1499000,
      stock: 19,
      image_url: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=1172&auto=format&fit=crop"
    },
    {
      olist_product_id: "e4275bac744c33641e2a795d01e8e32b",
      name: "Hộp Quà Tặng Đồng Hồ Cao Cấp",
      price: 299000,
      stock: 73,
      image_url: "https://images.unsplash.com/photo-1667284152842-f240b6634655?q=80&w=1170&auto=format&fit=crop"
    },
    {
      olist_product_id: "739ec9878497e19f019f5967fda86c9f",
      name: "Đồng hồ treo tường",
      price: 419000,
      stock: 27,
      image_url: "https://plus.unsplash.com/premium_photo-1725075084045-4c1ee2ab9349?q=80&w=1170&auto=format&fit=crop"
    }
  ]),
  ...buildProducts("brinquedos", [
    {
      olist_product_id: "624763d3909ffa36098f91ce1e458ed4",
      name: "Xe ô tô đồ chơi trẻ em",
      price: 259000,
      stock: 62,
      image_url: "https://images.unsplash.com/photo-1725297952113-36be1c7cefb4?q=80&w=1170&auto=format&fit=crop"
    },
    {
      olist_product_id: "1666b6ce6543ea221eac0c273d4ce8d7",
      name: "Gấu bông Teddy",
      price: 369000,
      stock: 41,
      image_url: "https://images.unsplash.com/photo-1602734846297-9299fc2d4703?q=80&w=736&auto=format&fit=crop"
    },
    {
      olist_product_id: "a3e72c791e95a01e787e7eaac25f7b2f",
      name: "Khối rubik 3x3",
      price: 489000,
      stock: 55,
      image_url: "https://images.unsplash.com/photo-1496354265829-17b1c7b7c363?q=80&w=1154&auto=format&fit=crop"
    },
    {
      olist_product_id: "bd7cd34fc6d02e730221b11edc354aae",
      name: "Bộ bài Tây",
      price: 599000,
      stock: 28,
      image_url: "https://plus.unsplash.com/premium_photo-1671683371896-53dc511734c3?q=80&w=686&auto=format&fit=crop"
    },
    {
      olist_product_id: "08065cf579a61fed0a11f26426a30d6c",
      name: "Vịt vàng cao su",
      price: 219000,
      stock: 67,
      image_url: "https://plus.unsplash.com/premium_photo-1723867212400-5b4dcc722a86?q=80&w=1170&auto=format&fit=crop"
    }
  ]),
  ...buildProducts("bebes", [
    {
      olist_product_id: "ed4eef5d2197b2950e6eec648488909d",
      name: "Bình sữa em bé",
      price: 3299000,
      stock: 12,
      image_url: "https://images.unsplash.com/photo-1747921719174-2d385e2f52b5?q=80&w=687&auto=format&fit=crop"
    },
    {
      olist_product_id: "ee80ea0c69b045dea85bfb8efed4bfac",
      name: "Giày vải em bé",
      price: 2199000,
      stock: 18,
      image_url: "https://images.unsplash.com/photo-1678192568478-9488ee55def6?q=80&w=687&auto=format&fit=crop"
    },
    {
      olist_product_id: "dac8681a7a366f747f42546e4922ad41",
      name: "Xe đẩy em bé màu đen",
      price: 1499000,
      stock: 24,
      image_url: "https://images.unsplash.com/photo-1611223355350-5be15e624fdf?q=80&w=727&auto=format&fit=crop"
    },
    {
      olist_product_id: "e2f86138b1dcd411b74b0d7a1fd8324b",
      name: "Núm vú ngậm silicon",
      price: 899000,
      stock: 33,
      image_url: "https://images.unsplash.com/photo-1707006049284-14916dc80160?q=80&w=1074&auto=format&fit=crop"
    },
    {
      olist_product_id: "23db0ed96c4c3278cd56fc70e4798742",
      name: "Yếm ăn dặm cho bé",
      price: 459000,
      stock: 59,
      image_url: "https://plus.unsplash.com/premium_photo-1675033153429-36c10a30b674?q=80&w=1169&auto=format&fit=crop"
    }
  ]),
  ...buildProducts("moveis_decoracao", [
    {
      olist_product_id: "acdb489a7451fff0633e91357a8e60eb",
      name: "Ghế văn phòng xoay",
      price: 1599000,
      stock: 21,
      image_url: "https://images.unsplash.com/photo-1688578735352-9a6f2ac3b70a?q=80&w=687&auto=format&fit=crop"
    },
    {
      olist_product_id: "1890c01a38d17958d79fe473d451dc9c",
      name: "Đèn bàn làm việc",
      price: 1799000,
      stock: 16,
      image_url: "https://images.unsplash.com/photo-1570974802254-4b0ad1a755f5?q=80&w=1170&auto=format&fit=crop"
    },
    {
      olist_product_id: "c4913f978f6af6755a1dcc8d16e76774",
      name: "Chậu cây xương rồng nhỏ",
      price: 999000,
      stock: 27,
      image_url: "https://plus.unsplash.com/premium_photo-1723662215441-39ad8a06ef20?q=80&w=704&auto=format&fit=crop"
    },
    {
      olist_product_id: "c57b94c82ebde2f6789cc52101988d19",
      name: "Gối tựa lưng sofa",
      price: 489000,
      stock: 45,
      image_url: "https://plus.unsplash.com/premium_photo-1676454000663-643ab3995b55?q=80&w=687&auto=format&fit=crop"
    },
    {
      olist_product_id: "e950f579a1170b4e385f734c5771e9f4",
      name: "Gương tròn treo tường",
      price: 2499000,
      stock: 11,
      image_url: "https://images.unsplash.com/photo-1619213348491-b7b7602727f9?q=80&w=735&auto=format&fit=crop"
    }
  ]),
  ...buildProducts("casa_conforto", [
    {
      olist_product_id: "db123b35396aafabb2d5b476557abed5",
      name: "Nến thơm hũ thủy tinh",
      price: 1299000,
      stock: 25,
      image_url: "https://plus.unsplash.com/premium_photo-1669824023993-273720598b14?q=80&w=687&auto=format&fit=crop"
    },
    {
      olist_product_id: "1c93b38903bf11d9a9bd28f3c65481d6",
      name: "Ly sứ uống cà phê",
      price: 569000,
      stock: 47,
      image_url: "https://images.unsplash.com/photo-1616241673111-508b4662c707?q=80&w=802&auto=format&fit=crop"
    },
    {
      olist_product_id: "cbe9e2a7ae078d6055bce05a0b9ad8b0",
      name: "Thớt gỗ nhà bếp",
      price: 699000,
      stock: 31,
      image_url: "https://plus.unsplash.com/premium_photo-1714702846875-ca3a149c0592?q=80&w=688&auto=format&fit=crop"
    },
    {
      olist_product_id: "e2fcaac49de7a3a90f0dc74d7b1e9f10",
      name: "Bình giữ nhiệt inox",
      price: 229000,
      stock: 82,
      image_url: "https://images.unsplash.com/photo-1581155203029-10e37ca5e006?q=80&w=880&auto=format&fit=crop"
    },
    {
      olist_product_id: "8b5551fceac21ae3ba546f410bb642d0",
      name: "Dép mang trong nhà",
      price: 189000,
      stock: 94,
      image_url: "https://plus.unsplash.com/premium_photo-1703622791378-0b6c8c3526f9?q=80&w=1170&auto=format&fit=crop"
    }
  ]),
  ...buildProducts("cama_mesa_banho", [
    {
      olist_product_id: "74cee16411adfa1d4d9a343d75aa6177",
      name: "Khăn tắm màu trắng",
      price: 1599000,
      stock: 29,
      image_url: "https://plus.unsplash.com/premium_photo-1684445034670-b36aca25c25a?q=80&w=687&auto=format&fit=crop"
    },
    {
      olist_product_id: "bd69e6d599b9a3d9c298617c14e46f9f",
      name: "Gối ngủ màu trắng",
      price: 379000,
      stock: 58,
      image_url: "https://images.unsplash.com/photo-1691207699465-603a8be4f7e3?q=80&w=880&auto=format&fit=crop"
    },
    {
      olist_product_id: "8e8d71f2bb02bf4ebb57a8017789f98d",
      name: "Áo choàng tắm cotton",
      price: 269000,
      stock: 73,
      image_url: "https://images.unsplash.com/photo-1710378439817-6159c79bda03?q=80&w=1631&auto=format&fit=crop"
    },
    {
      olist_product_id: "82cff05560eae73466f8778690b037fa",
      name: "Thảm lau chân nhà tắm",
      price: 549000,
      stock: 41,
      image_url: "https://images.unsplash.com/photo-1681742308509-e32e0a7c2cb8?q=80&w=687&auto=format&fit=crop"
    },
    {
      olist_product_id: "120fa011365fc39efe382cba4e50999e",
      name: "Bàn chải đánh răng tre",
      price: 459000,
      stock: 52,
      image_url: "https://images.unsplash.com/photo-1589365252845-092198ba5334?q=80&w=687&auto=format&fit=crop"
    }
  ])
];

async function initMongo() {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  const products = db.collection("products");
  // Ensure canonical seeded products exist (upsert only) - avoid deleting the entire collection to prevent data loss if seeding fails mid-run.

  for (const item of olistTopProducts) {
    const normalizedId = normalizeProductId(item.olist_product_id);
    await products.updateOne(
      { _id: normalizedId },
      {
        $set: {
          _id: normalizedId,
          ...item,
          created_at: new Date()
        }
      },
      { upsert: true }
    );
  }

  for (const item of historicalOlistProducts) {
    const normalizedId = normalizeProductId(item.olist_product_id);
    await products.updateOne(
      { _id: normalizedId },
      {
        $set: {
          _id: normalizedId,
          ...item,
          created_at: new Date(),
          historical_seed: true
        }
      },
      { upsert: true }
    );
  }
}

function getProductsCollection() {
  if (!db) {
    throw new Error("MongoDB is not initialized");
  }
  return db.collection("products");
}

async function pingMongo() {
  if (!db) {
    throw new Error("MongoDB is not initialized");
  }
  return db.command({ ping: 1 });
}

module.exports = { initMongo, getProductsCollection, pingMongo, historicalOlistProducts };
