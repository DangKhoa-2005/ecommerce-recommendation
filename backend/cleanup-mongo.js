db = db.getSiblingDB("ecommerce");
const oldCats = ["telefonica", "ferramentas_jardim", "fashion_bolsas_e_acessorios", "informatica_acessorios", "papelaria", "esporte_lazer"];
const result = db.products.deleteMany({ category: { `$in`: oldCats } });
print("Deleted: " + result.deletedCount);
print("Remaining categories:");
db.products.distinct("category").sort().forEach(cat => print(" - " + cat));
