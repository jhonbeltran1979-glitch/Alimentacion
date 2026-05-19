import { useState, useRef } from "react";

const FOOD_CATEGORIES = {
  "🥦 Verduras": [
    "Brócoli","Espinaca","Kale","Zanahoria","Remolacha","Pepino","Tomate",
    "Pimentón rojo","Cebolla","Ajo","Apio","Coliflor","Repollo","Lechuga",
    "Acelga","Espárragos","Champiñones","Habichuela","Calabaza","Ahuyama"
  ],
  "🍎 Frutas": [
    "Naranja","Mango","Papaya","Banano","Fresas","Arándanos","Kiwi","Limón",
    "Guayaba","Maracuyá","Melón","Sandía","Piña","Manzana","Pera","Uvas",
    "Granada","Lulo","Tomate de árbol","Feijoa","Curuba","Chontaduro","Borojó"
  ],
  "🍗 Proteínas": [
    "Pollo","Res","Cerdo","Atún","Salmón","Sardina","Huevos","Lentejas",
    "Frijoles negros","Garbanzos","Tofu","Quinoa","Trucha","Pavo",
    "Hígado de res","Hígado de pollo","Mojarra","Bagre","Bocachico",
    "Camarón","Chicharrón","Morcilla","Salchicha","Jamón"
  ],
  "🌾 Carbohidratos": [
    "Arroz integral","Arroz blanco","Papa","Yuca","Plátano","Avena",
    "Pan integral","Pasta integral","Maíz","Batata","Arepa de maíz",
    "Arepa de chócolo","Arepa de yuca","Tortilla de maíz","Pandebono",
    "Almojábana","Buñuelo","Empanada","Tamale","Sancocho"
  ],
  "🥑 Grasas saludables": [
    "Aguacate","Aceite de oliva","Nueces","Almendras","Maní","Semillas de chía",
    "Semillas de linaza","Coco","Aceite de coco","Semillas de girasol","Marañón"
  ],
  "🥛 Lácteos & Alternativos": [
    "Leche entera","Leche descremada","Yogur natural","Queso fresco","Queso costeño",
    "Kéfir","Leche de almendra","Leche de avena","Mantequilla","Queso cottage",
    "Kumis","Chocolate de mesa","Agua de panela"
  ],
  "💊 Extras & Superfoods": [
    "Cúrcuma","Jengibre","Canela","Miel","Polen de abeja","Spirulina","Moringa",
    "Chocolate negro 70%+","Té verde","Café","Kombucha","Panela"
  ]
};

const NUTRIENT_MAP = {
  "Brócoli":            { cals:55,  prot:3.7, carbs:11,  fat:0.6, vit_c:89,  vit_a:15,  hierro:0.7, calcio:47,  magnesio:21,  zinc:0.4, omega3:0,   vit_d:0,   vit_b12:0,   folato:63,  potasio:316, selenio:2,   fibra:2.6, vit_e:0.8 },
  "Espinaca":           { cals:23,  prot:2.9, carbs:3.6, fat:0.4, vit_c:28,  vit_a:469, hierro:2.7, calcio:99,  magnesio:79,  zinc:0.5, omega3:0.1, vit_d:0,   vit_b12:0,   folato:194, potasio:558, selenio:1,   fibra:2.2, vit_e:2   },
  "Kale":               { cals:49,  prot:4.3, carbs:8.8, fat:0.9, vit_c:120, vit_a:241, hierro:1.5, calcio:150, magnesio:34,  zinc:0.4, omega3:0.2, vit_d:0,   vit_b12:0,   folato:141, potasio:491, selenio:1,   fibra:3.6, vit_e:1.5 },
  "Zanahoria":          { cals:41,  prot:0.9, carbs:10,  fat:0.2, vit_c:6,   vit_a:835, hierro:0.3, calcio:33,  magnesio:12,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:19,  potasio:320, selenio:0.1, fibra:2.8, vit_e:0.7 },
  "Remolacha":          { cals:43,  prot:1.6, carbs:10,  fat:0.2, vit_c:5,   vit_a:2,   hierro:0.8, calcio:16,  magnesio:23,  zinc:0.4, omega3:0,   vit_d:0,   vit_b12:0,   folato:109, potasio:325, selenio:0.7, fibra:2.8, vit_e:0   },
  "Pepino":             { cals:15,  prot:0.7, carbs:3.6, fat:0.1, vit_c:3,   vit_a:5,   hierro:0.3, calcio:16,  magnesio:13,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:7,   potasio:147, selenio:0,   fibra:0.5, vit_e:0   },
  "Tomate":             { cals:18,  prot:0.9, carbs:3.9, fat:0.2, vit_c:14,  vit_a:42,  hierro:0.3, calcio:10,  magnesio:11,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:15,  potasio:237, selenio:0,   fibra:1.2, vit_e:0.5 },
  "Pimentón rojo":      { cals:31,  prot:1,   carbs:6,   fat:0.3, vit_c:128, vit_a:157, hierro:0.4, calcio:7,   magnesio:12,  zinc:0.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:46,  potasio:211, selenio:0,   fibra:2.1, vit_e:1.6 },
  "Cebolla":            { cals:40,  prot:1.1, carbs:9.3, fat:0.1, vit_c:7,   vit_a:0,   hierro:0.2, calcio:23,  magnesio:10,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:19,  potasio:146, selenio:0.5, fibra:1.7, vit_e:0   },
  "Ajo":                { cals:149, prot:6.4, carbs:33,  fat:0.5, vit_c:31,  vit_a:0,   hierro:1.7, calcio:181, magnesio:25,  zinc:1.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:3,   potasio:401, selenio:14,  fibra:2.1, vit_e:0   },
  "Aguacate":           { cals:160, prot:2,   carbs:9,   fat:15,  vit_c:10,  vit_a:7,   hierro:0.6, calcio:12,  magnesio:29,  zinc:0.6, omega3:0.1, vit_d:0,   vit_b12:0,   folato:81,  potasio:485, selenio:0.4, fibra:7,   vit_e:2.1 },
  "Apio":               { cals:16,  prot:0.7, carbs:3,   fat:0.2, vit_c:3,   vit_a:22,  hierro:0.2, calcio:40,  magnesio:11,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:36,  potasio:260, selenio:0.4, fibra:1.6, vit_e:0.3 },
  "Champiñones":        { cals:22,  prot:3.1, carbs:3.3, fat:0.3, vit_c:2,   vit_a:0,   hierro:0.5, calcio:3,   magnesio:9,   zinc:0.5, omega3:0,   vit_d:7,   vit_b12:0,   folato:17,  potasio:318, selenio:9.3, fibra:1,   vit_e:0   },
  "Coliflor":           { cals:25,  prot:1.9, carbs:5,   fat:0.3, vit_c:48,  vit_a:1,   hierro:0.4, calcio:22,  magnesio:15,  zinc:0.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:57,  potasio:299, selenio:0.6, fibra:2,   vit_e:0.1 },
  "Repollo":            { cals:25,  prot:1.3, carbs:6,   fat:0.1, vit_c:37,  vit_a:5,   hierro:0.5, calcio:40,  magnesio:12,  zinc:0.2, omega3:0.1, vit_d:0,   vit_b12:0,   folato:43,  potasio:170, selenio:0.9, fibra:2.5, vit_e:0.1 },
  "Lechuga":            { cals:15,  prot:1.4, carbs:2.9, fat:0.2, vit_c:9,   vit_a:166, hierro:0.9, calcio:36,  magnesio:14,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:64,  potasio:194, selenio:0.9, fibra:1.3, vit_e:0.3 },
  "Ahuyama":            { cals:26,  prot:1,   carbs:6.5, fat:0.1, vit_c:9,   vit_a:426, hierro:0.8, calcio:21,  magnesio:12,  zinc:0.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:16,  potasio:340, selenio:0.3, fibra:0.5, vit_e:1.1 },
  "Habichuela":         { cals:31,  prot:1.8, carbs:7,   fat:0.1, vit_c:12,  vit_a:35,  hierro:1,   calcio:37,  magnesio:25,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:33,  potasio:209, selenio:0.6, fibra:2.7, vit_e:0.4 },
  "Calabaza":           { cals:26,  prot:1,   carbs:6.5, fat:0.1, vit_c:9,   vit_a:426, hierro:0.8, calcio:21,  magnesio:12,  zinc:0.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:16,  potasio:340, selenio:0.3, fibra:0.5, vit_e:1.1 },
  "Naranja":            { cals:47,  prot:0.9, carbs:12,  fat:0.1, vit_c:53,  vit_a:11,  hierro:0.1, calcio:40,  magnesio:10,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:30,  potasio:181, selenio:0.5, fibra:2.4, vit_e:0.2 },
  "Mango":              { cals:60,  prot:0.8, carbs:15,  fat:0.4, vit_c:36,  vit_a:54,  hierro:0.2, calcio:11,  magnesio:10,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:43,  potasio:168, selenio:0.6, fibra:1.6, vit_e:0.9 },
  "Papaya":             { cals:43,  prot:0.5, carbs:11,  fat:0.3, vit_c:62,  vit_a:47,  hierro:0.3, calcio:20,  magnesio:21,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:37,  potasio:182, selenio:0.6, fibra:1.7, vit_e:0.3 },
  "Banano":             { cals:89,  prot:1.1, carbs:23,  fat:0.3, vit_c:9,   vit_a:3,   hierro:0.3, calcio:5,   magnesio:27,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:20,  potasio:358, selenio:1,   fibra:2.6, vit_e:0.1 },
  "Fresas":             { cals:32,  prot:0.7, carbs:7.7, fat:0.3, vit_c:59,  vit_a:1,   hierro:0.4, calcio:16,  magnesio:13,  zinc:0.1, omega3:0.1, vit_d:0,   vit_b12:0,   folato:24,  potasio:153, selenio:0.4, fibra:2,   vit_e:0.3 },
  "Arándanos":          { cals:57,  prot:0.7, carbs:14,  fat:0.3, vit_c:10,  vit_a:3,   hierro:0.3, calcio:6,   magnesio:6,   zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:6,   potasio:77,  selenio:0.1, fibra:2.4, vit_e:0.6 },
  "Kiwi":               { cals:61,  prot:1.1, carbs:15,  fat:0.5, vit_c:93,  vit_a:4,   hierro:0.3, calcio:34,  magnesio:17,  zinc:0.1, omega3:0.1, vit_d:0,   vit_b12:0,   folato:25,  potasio:312, selenio:0.2, fibra:3,   vit_e:1.5 },
  "Limón":              { cals:29,  prot:1.1, carbs:9,   fat:0.3, vit_c:53,  vit_a:1,   hierro:0.6, calcio:26,  magnesio:8,   zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:11,  potasio:138, selenio:0.4, fibra:2.8, vit_e:0.2 },
  "Guayaba":            { cals:68,  prot:2.6, carbs:14,  fat:1,   vit_c:228, vit_a:31,  hierro:0.3, calcio:18,  magnesio:22,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:49,  potasio:417, selenio:0.6, fibra:5.4, vit_e:0.7 },
  "Maracuyá":           { cals:97,  prot:2.2, carbs:23,  fat:0.7, vit_c:30,  vit_a:64,  hierro:1.6, calcio:12,  magnesio:29,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:14,  potasio:348, selenio:0.6, fibra:10,  vit_e:0   },
  "Piña":               { cals:50,  prot:0.5, carbs:13,  fat:0.1, vit_c:48,  vit_a:3,   hierro:0.3, calcio:13,  magnesio:12,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:18,  potasio:109, selenio:0.1, fibra:1.4, vit_e:0   },
  "Manzana":            { cals:52,  prot:0.3, carbs:14,  fat:0.2, vit_c:5,   vit_a:3,   hierro:0.1, calcio:6,   magnesio:5,   zinc:0,   omega3:0,   vit_d:0,   vit_b12:0,   folato:3,   potasio:107, selenio:0,   fibra:2.4, vit_e:0.2 },
  "Granada":            { cals:83,  prot:1.7, carbs:19,  fat:1.2, vit_c:10,  vit_a:0,   hierro:0.3, calcio:10,  magnesio:12,  zinc:0.4, omega3:0,   vit_d:0,   vit_b12:0,   folato:38,  potasio:236, selenio:0.5, fibra:4,   vit_e:0.6 },
  "Lulo":               { cals:31,  prot:0.7, carbs:7,   fat:0.2, vit_c:25,  vit_a:15,  hierro:0.4, calcio:8,   magnesio:10,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:12,  potasio:210, selenio:0.2, fibra:1.5, vit_e:0.2 },
  "Tomate de árbol":    { cals:31,  prot:1.5, carbs:7,   fat:0.3, vit_c:23,  vit_a:30,  hierro:0.9, calcio:10,  magnesio:22,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:15,  potasio:490, selenio:0.5, fibra:2,   vit_e:1.8 },
  "Feijoa":             { cals:55,  prot:0.7, carbs:13,  fat:0.6, vit_c:20,  vit_a:3,   hierro:0.1, calcio:17,  magnesio:9,   zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:38,  potasio:172, selenio:0.6, fibra:6.4, vit_e:0   },
  "Chontaduro":         { cals:148, prot:2.5, carbs:26,  fat:4.5, vit_c:15,  vit_a:240, hierro:0.8, calcio:20,  magnesio:30,  zinc:0.4, omega3:0,   vit_d:0,   vit_b12:0,   folato:10,  potasio:400, selenio:1,   fibra:3.5, vit_e:1   },
  "Pollo":              { cals:165, prot:31,  carbs:0,   fat:3.6, vit_c:0,   vit_a:6,   hierro:1,   calcio:15,  magnesio:29,  zinc:3,   omega3:0.1, vit_d:0.1, vit_b12:0.3, folato:4,   potasio:256, selenio:27,  fibra:0,   vit_e:0.3 },
  "Res":                { cals:250, prot:26,  carbs:0,   fat:17,  vit_c:0,   vit_a:0,   hierro:2.6, calcio:18,  magnesio:21,  zinc:4.8, omega3:0.1, vit_d:0.1, vit_b12:2.5, folato:6,   potasio:318, selenio:14,  fibra:0,   vit_e:0   },
  "Cerdo":              { cals:242, prot:27,  carbs:0,   fat:14,  vit_c:0,   vit_a:2,   hierro:0.9, calcio:19,  magnesio:28,  zinc:2.9, omega3:0,   vit_d:0.5, vit_b12:0.7, folato:0,   potasio:423, selenio:40,  fibra:0,   vit_e:0.1 },
  "Salmón":             { cals:208, prot:20,  carbs:0,   fat:13,  vit_c:0,   vit_a:11,  hierro:0.8, calcio:12,  magnesio:29,  zinc:0.6, omega3:2.2, vit_d:11,  vit_b12:3.2, folato:25,  potasio:363, selenio:36,  fibra:0,   vit_e:3.5 },
  "Atún":               { cals:144, prot:23,  carbs:0,   fat:5,   vit_c:0,   vit_a:5,   hierro:1,   calcio:13,  magnesio:31,  zinc:0.6, omega3:0.9, vit_d:4,   vit_b12:2.5, folato:2,   potasio:441, selenio:36,  fibra:0,   vit_e:1   },
  "Sardina":            { cals:208, prot:25,  carbs:0,   fat:11,  vit_c:0,   vit_a:54,  hierro:2.9, calcio:382, magnesio:39,  zinc:1.3, omega3:1.5, vit_d:4.8, vit_b12:8.9, folato:10,  potasio:397, selenio:52,  fibra:0,   vit_e:2   },
  "Huevos":             { cals:155, prot:13,  carbs:1.1, fat:11,  vit_c:0,   vit_a:149, hierro:1.8, calcio:56,  magnesio:12,  zinc:1.3, omega3:0.1, vit_d:2,   vit_b12:1.1, folato:47,  potasio:138, selenio:31,  fibra:0,   vit_e:1.1 },
  "Lentejas":           { cals:116, prot:9,   carbs:20,  fat:0.4, vit_c:2,   vit_a:1,   hierro:3.3, calcio:19,  magnesio:36,  zinc:1.3, omega3:0.1, vit_d:0,   vit_b12:0,   folato:181, potasio:369, selenio:2.8, fibra:7.9, vit_e:0.1 },
  "Frijoles negros":    { cals:132, prot:8.9, carbs:24,  fat:0.5, vit_c:0,   vit_a:1,   hierro:2.1, calcio:27,  magnesio:60,  zinc:1,   omega3:0.2, vit_d:0,   vit_b12:0,   folato:149, potasio:355, selenio:1.2, fibra:8.7, vit_e:0   },
  "Garbanzos":          { cals:164, prot:8.9, carbs:27,  fat:2.6, vit_c:2,   vit_a:1,   hierro:2.9, calcio:49,  magnesio:48,  zinc:1.5, omega3:0,   vit_d:0,   vit_b12:0,   folato:172, potasio:291, selenio:3.7, fibra:7.6, vit_e:0.4 },
  "Quinoa":             { cals:120, prot:4.4, carbs:22,  fat:1.9, vit_c:0,   vit_a:0,   hierro:1.5, calcio:17,  magnesio:64,  zinc:1.1, omega3:0.1, vit_d:0,   vit_b12:0,   folato:78,  potasio:172, selenio:2.8, fibra:2.8, vit_e:0   },
  "Pavo":               { cals:189, prot:29,  carbs:0,   fat:7,   vit_c:0,   vit_a:0,   hierro:1.4, calcio:13,  magnesio:26,  zinc:2.5, omega3:0.1, vit_d:0.1, vit_b12:0.3, folato:9,   potasio:271, selenio:26,  fibra:0,   vit_e:0   },
  "Hígado de res":      { cals:175, prot:27,  carbs:5,   fat:5,   vit_c:1,   vit_a:6582,hierro:6.2, calcio:11,  magnesio:18,  zinc:4,   omega3:0.4, vit_d:1.2, vit_b12:59,  folato:290, potasio:313, selenio:32,  fibra:0,   vit_e:0.4 },
  "Hígado de pollo":    { cals:119, prot:17,  carbs:1,   fat:4.8, vit_c:13,  vit_a:3296,hierro:8.9, calcio:8,   magnesio:19,  zinc:3.8, omega3:0.3, vit_d:0,   vit_b12:16,  folato:578, potasio:220, selenio:55,  fibra:0,   vit_e:0.6 },
  "Mojarra":            { cals:128, prot:26,  carbs:0,   fat:2.5, vit_c:0,   vit_a:0,   hierro:0.6, calcio:14,  magnesio:30,  zinc:0.5, omega3:0.3, vit_d:2,   vit_b12:1.5, folato:10,  potasio:380, selenio:36,  fibra:0,   vit_e:0.5 },
  "Bagre":              { cals:144, prot:22,  carbs:0,   fat:6,   vit_c:0,   vit_a:0,   hierro:0.7, calcio:15,  magnesio:23,  zinc:0.7, omega3:0.5, vit_d:2,   vit_b12:2,   folato:8,   potasio:330, selenio:12,  fibra:0,   vit_e:1   },
  "Bocachico":          { cals:110, prot:23,  carbs:0,   fat:1.5, vit_c:0,   vit_a:0,   hierro:1,   calcio:40,  magnesio:25,  zinc:0.5, omega3:0.3, vit_d:2,   vit_b12:1.5, folato:8,   potasio:350, selenio:10,  fibra:0,   vit_e:0.5 },
  "Camarón":            { cals:99,  prot:24,  carbs:0.2, fat:0.3, vit_c:0,   vit_a:0,   hierro:0.5, calcio:70,  magnesio:39,  zinc:1.6, omega3:0.3, vit_d:0,   vit_b12:1.4, folato:3,   potasio:259, selenio:38,  fibra:0,   vit_e:1.3 },
  "Chicharrón":         { cals:544, prot:30,  carbs:0,   fat:47,  vit_c:0,   vit_a:0,   hierro:0.5, calcio:12,  magnesio:15,  zinc:2,   omega3:0,   vit_d:0,   vit_b12:0.5, folato:0,   potasio:200, selenio:20,  fibra:0,   vit_e:0   },
  "Morcilla":           { cals:378, prot:14,  carbs:15,  fat:30,  vit_c:0,   vit_a:0,   hierro:5,   calcio:15,  magnesio:12,  zinc:2,   omega3:0,   vit_d:0,   vit_b12:1,   folato:5,   potasio:180, selenio:8,   fibra:0,   vit_e:0   },
  "Arroz integral":     { cals:216, prot:5,   carbs:45,  fat:1.8, vit_c:0,   vit_a:0,   hierro:1,   calcio:10,  magnesio:84,  zinc:1.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:19,  potasio:154, selenio:19,  fibra:3.5, vit_e:0   },
  "Arroz blanco":       { cals:206, prot:4.3, carbs:45,  fat:0.4, vit_c:0,   vit_a:0,   hierro:0.2, calcio:10,  magnesio:12,  zinc:0.5, omega3:0,   vit_d:0,   vit_b12:0,   folato:5,   potasio:55,  selenio:7.5, fibra:0.6, vit_e:0   },
  "Papa":               { cals:77,  prot:2,   carbs:17,  fat:0.1, vit_c:20,  vit_a:0,   hierro:0.8, calcio:12,  magnesio:23,  zinc:0.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:15,  potasio:421, selenio:0.3, fibra:2.2, vit_e:0   },
  "Yuca":               { cals:160, prot:1.4, carbs:38,  fat:0.3, vit_c:21,  vit_a:1,   hierro:0.3, calcio:16,  magnesio:21,  zinc:0.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:27,  potasio:271, selenio:0.7, fibra:1.8, vit_e:0   },
  "Plátano":            { cals:122, prot:1.3, carbs:31,  fat:0.4, vit_c:18,  vit_a:56,  hierro:0.6, calcio:3,   magnesio:37,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:22,  potasio:499, selenio:1.5, fibra:2.3, vit_e:0.1 },
  "Avena":              { cals:389, prot:17,  carbs:66,  fat:7,   vit_c:0,   vit_a:0,   hierro:4.7, calcio:54,  magnesio:177, zinc:3.9, omega3:0.1, vit_d:0,   vit_b12:0,   folato:56,  potasio:429, selenio:28,  fibra:10,  vit_e:0.7 },
  "Batata":             { cals:86,  prot:1.6, carbs:20,  fat:0.1, vit_c:20,  vit_a:961, hierro:0.7, calcio:30,  magnesio:25,  zinc:0.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:11,  potasio:337, selenio:0.6, fibra:3,   vit_e:0.3 },
  "Arepa de maíz":      { cals:218, prot:5,   carbs:44,  fat:2,   vit_c:0,   vit_a:0,   hierro:1.5, calcio:65,  magnesio:30,  zinc:0.8, omega3:0,   vit_d:0,   vit_b12:0,   folato:10,  potasio:120, selenio:5,   fibra:2.5, vit_e:0.2 },
  "Arepa de chócolo":   { cals:245, prot:6,   carbs:46,  fat:4,   vit_c:0,   vit_a:8,   hierro:1,   calcio:80,  magnesio:28,  zinc:0.7, omega3:0,   vit_d:0,   vit_b12:0,   folato:15,  potasio:150, selenio:4,   fibra:2,   vit_e:0.3 },
  "Pandebono":          { cals:310, prot:7,   carbs:45,  fat:12,  vit_c:0,   vit_a:20,  hierro:0.5, calcio:150, magnesio:10,  zinc:0.5, omega3:0,   vit_d:0,   vit_b12:0.2, folato:5,   potasio:80,  selenio:3,   fibra:0.5, vit_e:0.2 },
  "Sancocho":           { cals:120, prot:8,   carbs:15,  fat:3,   vit_c:8,   vit_a:20,  hierro:0.8, calcio:20,  magnesio:18,  zinc:1,   omega3:0.1, vit_d:0,   vit_b12:0.3, folato:12,  potasio:280, selenio:5,   fibra:1.5, vit_e:0.2 },
  "Aceite de oliva":    { cals:884, prot:0,   carbs:0,   fat:100, vit_c:0,   vit_a:0,   hierro:0.6, calcio:1,   magnesio:0,   zinc:0,   omega3:0.8, vit_d:0,   vit_b12:0,   folato:0,   potasio:1,   selenio:0,   fibra:0,   vit_e:14  },
  "Nueces":             { cals:654, prot:15,  carbs:14,  fat:65,  vit_c:1,   vit_a:1,   hierro:2.9, calcio:98,  magnesio:158, zinc:3.1, omega3:9,   vit_d:0,   vit_b12:0,   folato:98,  potasio:441, selenio:4.9, fibra:6.7, vit_e:0.7 },
  "Almendras":          { cals:579, prot:21,  carbs:22,  fat:50,  vit_c:0,   vit_a:0,   hierro:3.7, calcio:264, magnesio:270, zinc:3.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:44,  potasio:733, selenio:4.1, fibra:12,  vit_e:25  },
  "Maní":               { cals:567, prot:26,  carbs:16,  fat:49,  vit_c:0,   vit_a:0,   hierro:4.6, calcio:92,  magnesio:168, zinc:3.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:240, potasio:705, selenio:7.2, fibra:8.5, vit_e:8.3 },
  "Semillas de chía":   { cals:486, prot:17,  carbs:42,  fat:31,  vit_c:1,   vit_a:54,  hierro:7.7, calcio:631, magnesio:335, zinc:4.6, omega3:17,  vit_d:0,   vit_b12:0,   folato:49,  potasio:407, selenio:55,  fibra:34,  vit_e:0.5 },
  "Semillas de linaza": { cals:534, prot:18,  carbs:29,  fat:42,  vit_c:1,   vit_a:0,   hierro:5.7, calcio:255, magnesio:392, zinc:4.3, omega3:22,  vit_d:0,   vit_b12:0,   folato:87,  potasio:813, selenio:25,  fibra:27,  vit_e:0.3 },
  "Leche entera":       { cals:61,  prot:3.2, carbs:4.8, fat:3.3, vit_c:0,   vit_a:46,  hierro:0.1, calcio:113, magnesio:10,  zinc:0.4, omega3:0.1, vit_d:1.2, vit_b12:0.4, folato:5,   potasio:150, selenio:3.7, fibra:0,   vit_e:0.1 },
  "Leche descremada":   { cals:34,  prot:3.4, carbs:5,   fat:0.1, vit_c:0,   vit_a:50,  hierro:0.1, calcio:122, magnesio:11,  zinc:0.4, omega3:0,   vit_d:1.2, vit_b12:0.4, folato:5,   potasio:156, selenio:3.7, fibra:0,   vit_e:0   },
  "Yogur natural":      { cals:59,  prot:10,  carbs:3.6, fat:0.4, vit_c:0,   vit_a:2,   hierro:0.1, calcio:110, magnesio:11,  zinc:0.5, omega3:0,   vit_d:0,   vit_b12:1.3, folato:7,   potasio:141, selenio:9.7, fibra:0,   vit_e:0   },
  "Queso fresco":       { cals:98,  prot:7,   carbs:2,   fat:7,   vit_c:0,   vit_a:60,  hierro:0.2, calcio:210, magnesio:8,   zinc:0.7, omega3:0,   vit_d:0.2, vit_b12:0.5, folato:12,  potasio:85,  selenio:5,   fibra:0,   vit_e:0.1 },
  "Queso costeño":      { cals:300, prot:20,  carbs:2,   fat:24,  vit_c:0,   vit_a:80,  hierro:0.3, calcio:500, magnesio:10,  zinc:1.5, omega3:0,   vit_d:0.2, vit_b12:0.8, folato:10,  potasio:100, selenio:7,   fibra:0,   vit_e:0.2 },
  "Kéfir":              { cals:61,  prot:3.8, carbs:5,   fat:2,   vit_c:0,   vit_a:32,  hierro:0.1, calcio:130, magnesio:15,  zinc:0.4, omega3:0.1, vit_d:0.4, vit_b12:0.4, folato:10,  potasio:180, selenio:2,   fibra:0,   vit_e:0   },
  "Kumis":              { cals:65,  prot:3.5, carbs:5.5, fat:2.5, vit_c:0,   vit_a:30,  hierro:0.1, calcio:120, magnesio:10,  zinc:0.4, omega3:0,   vit_d:0.5, vit_b12:0.5, folato:6,   potasio:145, selenio:3,   fibra:0,   vit_e:0   },
  "Chocolate de mesa":  { cals:380, prot:6,   carbs:55,  fat:18,  vit_c:0,   vit_a:10,  hierro:4,   calcio:80,  magnesio:100, zinc:1.5, omega3:0,   vit_d:0,   vit_b12:0,   folato:8,   potasio:300, selenio:3,   fibra:5,   vit_e:0.3 },
  "Agua de panela":     { cals:88,  prot:0.2, carbs:23,  fat:0,   vit_c:0,   vit_a:0,   hierro:1.5, calcio:40,  magnesio:15,  zinc:0.1, omega3:0,   vit_d:0,   vit_b12:0,   folato:2,   potasio:100, selenio:0.5, fibra:0,   vit_e:0   },
  "Cúrcuma":            { cals:354, prot:8,   carbs:65,  fat:10,  vit_c:26,  vit_a:0,   hierro:41,  calcio:183, magnesio:193, zinc:4.4, omega3:0,   vit_d:0,   vit_b12:0,   folato:39,  potasio:2525,selenio:4.5, fibra:21,  vit_e:3.1 },
  "Jengibre":           { cals:80,  prot:1.8, carbs:18,  fat:0.8, vit_c:5,   vit_a:0,   hierro:0.6, calcio:16,  magnesio:43,  zinc:0.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:11,  potasio:415, selenio:0.7, fibra:2,   vit_e:0   },
  "Té verde":           { cals:1,   prot:0.2, carbs:0.2, fat:0,   vit_c:0,   vit_a:0,   hierro:0,   calcio:0,   magnesio:1,   zinc:0,   omega3:0,   vit_d:0,   vit_b12:0,   folato:5,   potasio:21,  selenio:0,   fibra:0,   vit_e:0   },
  "Café":               { cals:2,   prot:0.3, carbs:0,   fat:0,   vit_c:0,   vit_a:0,   hierro:0.1, calcio:2,   magnesio:7,   zinc:0,   omega3:0,   vit_d:0,   vit_b12:0,   folato:5,   potasio:116, selenio:0,   fibra:0,   vit_e:0   },
  "Kombucha":           { cals:16,  prot:0,   carbs:3,   fat:0,   vit_c:0,   vit_a:0,   hierro:0,   calcio:0,   magnesio:0,   zinc:0,   omega3:0,   vit_d:0,   vit_b12:0.1, folato:0,   potasio:0,   selenio:0,   fibra:0,   vit_e:0   },
  "Chocolate negro 70%+":{ cals:598,prot:7.8, carbs:46,  fat:43,  vit_c:0,   vit_a:0,   hierro:11,  calcio:56,  magnesio:228, zinc:3.3, omega3:0,   vit_d:0,   vit_b12:0,   folato:9,   potasio:715, selenio:3.1, fibra:11,  vit_e:0.5 },
  "Miel":               { cals:304, prot:0.3, carbs:82,  fat:0,   vit_c:0.5, vit_a:0,   hierro:0.4, calcio:6,   magnesio:2,   zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:2,   potasio:52,  selenio:0.8, fibra:0.2, vit_e:0   },
  "Spirulina":          { cals:290, prot:57,  carbs:24,  fat:8,   vit_c:10,  vit_a:570, hierro:28,  calcio:120, magnesio:195, zinc:2,   omega3:0,   vit_d:0,   vit_b12:0,   folato:94,  potasio:1363,selenio:7.2, fibra:3.6, vit_e:5   },
  "Panela":             { cals:383, prot:0.3, carbs:98,  fat:0.1, vit_c:0,   vit_a:0,   hierro:4,   calcio:67,  magnesio:25,  zinc:0.2, omega3:0,   vit_d:0,   vit_b12:0,   folato:2,   potasio:350, selenio:1,   fibra:0,   vit_e:0   },
};

const DEFAULT_N = { cals:80,prot:3,carbs:10,fat:1.5,vit_c:8,vit_a:20,hierro:0.8,calcio:30,magnesio:20,zinc:0.4,omega3:0,vit_d:0,vit_b12:0,folato:15,potasio:200,selenio:1.5,fibra:2,vit_e:0.5 };

const DAILY_TARGETS = {
  cals:2000,prot:50,carbs:275,fat:65,vit_c:75,vit_a:700,hierro:18,
  calcio:1000,magnesio:400,zinc:8,omega3:1.6,vit_d:15,vit_b12:2.4,
  folato:400,potasio:3500,selenio:55,fibra:28,vit_e:15
};

const OBJ_NUTRIENTS = {
  "Energía":      ["cals","prot","carbs","hierro","magnesio","vit_b12","folato","potasio"],
  "Concentración":["omega3","vit_b12","folato","magnesio","vit_e","selenio","zinc"],
  "Inmunidad":    ["vit_c","vit_d","vit_a","zinc","selenio","vit_e","folato"],
  "Sueño":        ["magnesio","potasio","calcio","vit_b12","vit_d"],
};

const NL = {
  cals:"Calorías",prot:"Proteína",carbs:"Carbohidratos",fat:"Grasas",
  vit_c:"Vitamina C",vit_a:"Vitamina A",hierro:"Hierro",calcio:"Calcio",
  magnesio:"Magnesio",zinc:"Zinc",omega3:"Omega-3",vit_d:"Vitamina D",
  vit_b12:"Vitamina B12",folato:"Folato",potasio:"Potasio",selenio:"Selenio",
  fibra:"Fibra",vit_e:"Vitamina E"
};

const NU = {
  cals:"kcal",prot:"g",carbs:"g",fat:"g",vit_c:"mg",vit_a:"μg",
  hierro:"mg",calcio:"mg",magnesio:"mg",zinc:"mg",omega3:"g",
  vit_d:"μg",vit_b12:"μg",folato:"μg",potasio:"mg",selenio:"μg",fibra:"g",vit_e:"mg"
};

const OBJ_META = [
  {key:"Energía",      icon:"⚡",color:"#f59e0b",desc:"Vitalidad & energía"},
  {key:"Concentración",icon:"🧠",color:"#7c3aed",desc:"Foco mental"},
  {key:"Inmunidad",    icon:"🛡️",color:"#00d4aa",desc:"Defensas"},
  {key:"Sueño",        icon:"🌙",color:"#ec4899",desc:"Recuperación"},
];

const PORTIONS = [
  {label:"¼",val:0.25},{label:"½",val:0.5},{label:"1",val:1},
  {label:"1½",val:1.5},{label:"2",val:2},{label:"3",val:3}
];

const C={bg:"#0a0a0f",card:"#16161f",border:"#1e1e2e",accent:"#00d4aa",accent2:"#7c3aed",text:"#e8e8f0",muted:"#6b6b8a"};

function calcTotals(items){
  const t=Object.fromEntries(Object.keys(DAILY_TARGETS).map(k=>[k,0]));
  items.forEach(({name,portion})=>{
    const n=NUTRIENT_MAP[name]||DEFAULT_N;
    Object.keys(t).forEach(k=>{if(n[k]!==undefined)t[k]+=n[k]*portion;});
  });
  return t;
}
function calcScore(totals,keys){
  const v=keys.filter(k=>DAILY_TARGETS[k]);
  if(!v.length)return 0;
  return Math.round(v.map(k=>Math.min(100,(totals[k]||0)/DAILY_TARGETS[k]*100)).reduce((a,b)=>a+b,0)/v.length);
}
function pct(v,t){return Math.min(100,Math.round((v/t)*100));}

function RadialScore({score,color,size=72}){
  const r=size/2-7,circ=2*Math.PI*r,dash=(score/100)*circ;
  return(
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e2e" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 1s ease"}}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{fontSize:size*0.2,fontWeight:700,fill:color,fontFamily:"monospace",
        transform:"rotate(90deg)",transformOrigin:`${size/2}px ${size/2}px`}}>{score}%</text>
    </svg>
  );
}

function MicroBar({label,val,target,unit}){
  const p=pct(val,target);
  const color=p<40?"#ef4444":p<70?"#f59e0b":"#00d4aa";
  const falta=Math.max(0,target-val);
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
        <span style={{color:C.text,fontWeight:500}}>{label}</span>
        <span style={{color,fontFamily:"monospace",fontSize:11}}>{p}%</span>
      </div>
      <div style={{height:5,borderRadius:99,background:"#1e1e2e",overflow:"hidden",marginBottom:3}}>
        <div style={{height:"100%",width:`${p}%`,background:color,borderRadius:99,transition:"width 0.8s ease"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted}}>
        <span>{Math.round(val)} / {target} {unit}</span>
        {p<100&&<span style={{color:p<40?"#ef4444":"#f59e0b"}}>Falta: {Math.round(falta)} {unit}</span>}
        {p>=100&&<span style={{color:"#00d4aa"}}>✓ Completo</span>}
      </div>
    </div>
  );
}

export default function App(){
  const [tab,setTab]=useState("log");
  const [items,setItems]=useState([]);
  const [openCat,setOpenCat]=useState(null);
  const [analysis,setAnalysis]=useState("");
  const [loading,setLoading]=useState(false);
  const [searchQ,setSearchQ]=useState("");
  const [saveMsg,setSaveMsg]=useState("");
  const [customName,setCustomName]=useState("");
  const [showCustom,setShowCustom]=useState(false);
  const [history,setHistory]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("vt_hx")||"[]");}catch{return[];}
  });
  const analysisRef=useRef(null);

  const totals=calcTotals(items);
  const scores=Object.fromEntries(OBJ_META.map(o=>[o.key,calcScore(totals,OBJ_NUTRIENTS[o.key])]));
  const overall=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/4);

  const getItem=name=>items.find(i=>i.name===name);

  const toggleFood=(name)=>{
    setItems(prev=>{
      if(prev.find(i=>i.name===name)) return prev.filter(i=>i.name!==name);
      return [...prev,{name,portion:1}];
    });
  };

  const setPortion=(name,portion)=>{
    setItems(prev=>prev.map(i=>i.name===name?{...i,portion}:i));
  };

  const addCustomFood=()=>{
    const n=customName.trim();
    if(!n)return;
    if(!items.find(i=>i.name===n)) setItems(prev=>[...prev,{name:n,portion:1}]);
    setCustomName("");setShowCustom(false);
  };

  const saveDay=()=>{
    const today=new Date().toLocaleDateString("es-CO");
    const entry={date:today,items,scores,totals};
    const updated=[entry,...history.slice(0,6)];
    setHistory(updated);
    localStorage.setItem("vt_hx",JSON.stringify(updated));
    setSaveMsg("✓ Guardado");setTimeout(()=>setSaveMsg(""),2000);
  };

  const getAnalysis=async()=>{
    setLoading(true);setTab("analysis");
    setTimeout(()=>analysisRef.current?.scrollIntoView({behavior:"smooth"}),100);
    const def=Object.entries(DAILY_TARGETS).filter(([k])=>k!=="cals")
      .map(([k,t])=>({label:NL[k],p:pct(totals[k]||0,t),falta:Math.round(Math.max(0,t-(totals[k]||0))),unit:NU[k]}))
      .filter(d=>d.p<70).sort((a,b)=>a.p-b.p).slice(0,8);
    const prompt=`Eres nutricionista experto para familias colombianas. Analiza esta ingesta y da recomendaciones prácticas.

ALIMENTOS HOY: ${items.map(i=>`${i.name} (${i.portion} porción)`).join(", ")||"Ninguno"}
SCORES: Energía ${scores["Energía"]}% | Concentración ${scores["Concentración"]}% | Inmunidad ${scores["Inmunidad"]}% | Sueño ${scores["Sueño"]}%
DÉFICITS: ${def.map(d=>`${d.label}: ${d.p}% (faltan ${d.falta}${d.unit})`).join(", ")}
MACROS: ${Math.round(totals.cals)}kcal | Prot:${Math.round(totals.prot)}g | Carbs:${Math.round(totals.carbs)}g | Grasas:${Math.round(totals.fat)}g

Proporciona en español (máx 280 palabras):
1. **Evaluación general** (2 oraciones)
2. **Top 3 deficiencias** con alimentos colombianos específicos para corregirlas HOY
3. **Combinación ideal** para la próxima comida que maximice los scores bajos
4. **Tip de timing** para energía y concentración
5. **Tip inmunidad** específico

Sé concreto y usa alimentos fáciles de conseguir en Colombia.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const data=await res.json();
      setAnalysis(data.content?.[0]?.text||"No se pudo obtener análisis.");
    }catch{setAnalysis("Error al conectar. Verifica tu conexión e intenta de nuevo.");}
    setLoading(false);
  };

  const allFoods=Object.values(FOOD_CATEGORIES).flat();
  const filtered=searchQ?allFoods.filter(f=>f.toLowerCase().includes(searchQ.toLowerCase())):null;

  const TABS=[{id:"log",icon:"🥗",label:"Registro"},{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"analysis",icon:"🤖",label:"Análisis IA"},{id:"history",icon:"📅",label:"Historial"}];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0f0f1a,#16162a)",borderBottom:`1px solid ${C.border}`,padding:"20px 24px 0",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#00d4aa,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 0 20px rgba(0,212,170,0.3)"}}>🌿</div>
            <div>
              <h1 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>VitalTrack</h1>
              <p style={{margin:0,fontSize:11,color:C.muted}}>Optimización nutricional familiar</p>
            </div>
            <div style={{marginLeft:"auto",textAlign:"right"}}>
              <div style={{fontSize:26,fontWeight:800,color:C.accent,fontFamily:"monospace"}}>{overall}%</div>
              <div style={{fontSize:10,color:C.muted}}>Score global</div>
            </div>
          </div>
          <div style={{display:"flex",gap:2}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 4px",border:"none",cursor:"pointer",background:"transparent",borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",color:tab===t.id?C.accent:C.muted,fontSize:11,fontWeight:600,transition:"all 0.2s"}}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"20px 16px 100px"}}>

        {/* ── REGISTRO ── */}
        {tab==="log"&&(
          <div>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Buscar alimento..."
              style={{width:"100%",padding:"12px 16px",boxSizing:"border-box",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,color:C.text,fontSize:14,outline:"none",marginBottom:12}}/>

            {/* Agregar alimento personalizado */}
            <div style={{marginBottom:16}}>
              {!showCustom
                ? <button onClick={()=>setShowCustom(true)} style={{width:"100%",padding:"10px",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:10,color:C.muted,fontSize:13,cursor:"pointer"}}>
                    ➕ Agregar alimento que no está en la lista
                  </button>
                : <div style={{display:"flex",gap:8}}>
                    <input value={customName} onChange={e=>setCustomName(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&addCustomFood()}
                      placeholder="Nombre del alimento..." autoFocus
                      style={{flex:1,padding:"10px 14px",background:C.card,border:`1px solid ${C.accent}`,borderRadius:10,color:C.text,fontSize:13,outline:"none"}}/>
                    <button onClick={addCustomFood} style={{padding:"10px 16px",background:C.accent,border:"none",borderRadius:10,color:"#000",fontWeight:700,cursor:"pointer",fontSize:13}}>Agregar</button>
                    <button onClick={()=>{setShowCustom(false);setCustomName("");}} style={{padding:"10px",background:C.border,border:"none",borderRadius:10,color:C.text,cursor:"pointer"}}>✕</button>
                  </div>
              }
            </div>

            {/* Seleccionados con porciones */}
            {items.length>0&&(
              <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:14,marginBottom:16}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:10,fontWeight:600}}>✅ REGISTRADO HOY ({items.length})</div>
                {items.map(item=>(
                  <div key={item.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                    <button onClick={()=>toggleFood(item.name)} style={{background:"rgba(239,68,68,0.15)",border:"none",borderRadius:6,color:"#ef4444",padding:"2px 8px",fontSize:11,cursor:"pointer"}}>✕</button>
                    <span style={{fontSize:13,fontWeight:500,flex:1,minWidth:80}}>{item.name}</span>
                    <div style={{display:"flex",gap:4"}}>
                      {PORTIONS.map(p=>(
                        <button key={p.val} onClick={()=>setPortion(item.name,p.val)} style={{
                          padding:"3px 7px",borderRadius:6,border:"none",fontSize:11,cursor:"pointer",fontWeight:item.portion===p.val?700:400,
                          background:item.portion===p.val?"rgba(0,212,170,0.2)":C.border,
                          color:item.portion===p.val?C.accent:C.muted,
                          outline:item.portion===p.val?`1px solid ${C.accent}`:"none"
                        }}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Búsqueda o categorías */}
            {filtered?(
              <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:16,overflow:"hidden"}}>
                {filtered.length===0
                  ?<p style={{color:C.muted,padding:16,margin:0,fontSize:13}}>Sin resultados — usa "Agregar alimento" para agregarlo manualmente</p>
                  :filtered.map(f=>(
                    <div key={f} onClick={()=>toggleFood(f)} style={{padding:"10px 16px",cursor:"pointer",fontSize:13,
                      background:getItem(f)?"rgba(0,212,170,0.1)":"transparent",
                      color:getItem(f)?C.accent:C.text,borderBottom:`1px solid ${C.border}`,
                      display:"flex",justifyContent:"space-between"}}>
                      {f} {getItem(f)&&"✓"}
                    </div>
                  ))
                }
              </div>
            ):Object.entries(FOOD_CATEGORIES).map(([cat,foods])=>(
              <div key={cat} style={{marginBottom:10}}>
                <button onClick={()=>setOpenCat(openCat===cat?null:cat)} style={{width:"100%",padding:"14px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,color:C.text,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span>{cat}</span>
                  <span style={{color:C.muted,fontSize:12}}>
                    {foods.filter(f=>getItem(f)).length>0&&<span style={{color:C.accent,marginRight:8}}>{foods.filter(f=>getItem(f)).length} ✓</span>}
                    {openCat===cat?"▲":"▼"}
                  </span>
                </button>
                {openCat===cat&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
                    {foods.map(f=>(
                      <button key={f} onClick={()=>toggleFood(f)} style={{padding:"10px 12px",border:getItem(f)?"1px solid rgba(0,212,170,0.5)":`1px solid ${C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left",fontSize:13,background:getItem(f)?"rgba(0,212,170,0.12)":C.card,color:getItem(f)?C.accent:C.text,transition:"all 0.15s"}}>
                        {getItem(f)?"✓ ":""}{f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={saveDay} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:C.border,color:C.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>{saveMsg||"💾 Guardar día"}</button>
              <button onClick={getAnalysis} disabled={items.length===0} style={{flex:2,padding:"14px",borderRadius:12,border:"none",background:items.length===0?C.border:"linear-gradient(135deg,#00d4aa,#7c3aed)",color:"white",fontSize:14,fontWeight:700,cursor:items.length===0?"not-allowed":"pointer"}}>🤖 Analizar con IA</button>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              {OBJ_META.map(obj=>(
                <div key={obj.key} style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:16,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                  <div style={{fontSize:20}}>{obj.icon}</div>
                  <RadialScore score={scores[obj.key]} color={obj.color} size={72}/>
                  <div style={{fontSize:12,fontWeight:700,color:obj.color}}>{obj.key}</div>
                  <div style={{fontSize:10,color:C.muted,textAlign:"center"}}>{obj.desc}</div>
                </div>
              ))}
            </div>
            {[
              {title:"📊 Macronutrientes",keys:["cals","prot","carbs","fat","fibra"]},
              {title:"🧬 Vitaminas",keys:["vit_c","vit_a","vit_d","vit_b12","vit_e","folato"]},
              {title:"⚗️ Minerales & Omega",keys:["calcio","magnesio","hierro","zinc","potasio","selenio","omega3"]},
            ].map(s=>(
              <div key={s.title} style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:16,marginBottom:12}}>
                <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700}}>{s.title}</h3>
                {s.keys.map(k=><MicroBar key={k} label={NL[k]} val={totals[k]||0} target={DAILY_TARGETS[k]} unit={NU[k]}/>)}
              </div>
            ))}
          </div>
        )}

        {/* ── ANÁLISIS IA ── */}
        {tab==="analysis"&&(
          <div ref={analysisRef}>
            {!analysis&&!loading&&(
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{fontSize:64,marginBottom:16}}>🤖</div>
                <p style={{color:C.muted,fontSize:14,lineHeight:1.6}}>Selecciona tus alimentos en <strong style={{color:C.text}}>Registro</strong> y presiona <strong style={{color:C.accent}}>"Analizar con IA"</strong>.</p>
              </div>
            )}
            {loading&&(
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{fontSize:48,marginBottom:12,display:"inline-block",animation:"spin 1s linear infinite"}}>🔄</div>
                <p style={{color:C.muted}}>Analizando tu nutrición...</p>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
            {analysis&&!loading&&(
              <div>
                <div style={{background:"linear-gradient(135deg,rgba(0,212,170,0.08),rgba(124,58,237,0.08))",border:"1px solid rgba(0,212,170,0.2)",borderRadius:16,padding:20,marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:20}}>🤖</span>
                    <span style={{fontSize:14,fontWeight:700,color:C.accent}}>Análisis Nutricional IA</span>
                    <span style={{marginLeft:"auto",fontSize:11,color:C.muted}}>{items.length} alimentos · Score {overall}%</span>
                  </div>
                  <div style={{fontSize:13.5,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap"}}>{analysis}</div>
                </div>
                <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:16}}>
                  <h3 style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:C.muted}}>⚠️ NUTRIENTES QUE TE FALTAN HOY</h3>
                  {Object.entries(DAILY_TARGETS).filter(([k])=>k!=="cals"&&pct(totals[k]||0,DAILY_TARGETS[k])<70)
                    .sort(([a],[b])=>pct(totals[a]||0,DAILY_TARGETS[a])-pct(totals[b]||0,DAILY_TARGETS[b])).slice(0,8)
                    .map(([k,t])=>{
                      const p=pct(totals[k]||0,t);
                      const falta=Math.round(Math.max(0,t-(totals[k]||0)));
                      return(
                        <div key={k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                          <div style={{width:40,height:40,borderRadius:8,flexShrink:0,background:p<30?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,fontFamily:"monospace",color:p<30?"#ef4444":"#f59e0b"}}>{p}%</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600}}>{NL[k]}</div>
                            <div style={{fontSize:11,color:C.muted}}>{Math.round(totals[k]||0)} / {t} {NU[k]}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:11,color:"#f59e0b",fontWeight:600}}>Falta</div>
                            <div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"monospace"}}>{falta} {NU[k]}</div>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
                <button onClick={getAnalysis} style={{width:"100%",marginTop:12,padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:C.border,color:C.text,fontSize:13,fontWeight:600}}>🔄 Regenerar análisis</button>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab==="history"&&(
          <div>
            {history.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{fontSize:48,marginBottom:12}}>📅</div>
                <p style={{color:C.muted,fontSize:14}}>Aún no tienes días guardados.<br/>Registra tu alimentación y presiona "Guardar día".</p>
              </div>
            ):history.map((entry,i)=>(
              <div key={i} style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:14,fontWeight:700}}>{entry.date}</div>
                  <div style={{fontSize:12,color:C.muted}}>{entry.items?.length||entry.foods?.length||0} alimentos</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
                  {OBJ_META.map(obj=>(
                    <div key={obj.key} style={{textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:800,color:obj.color,fontFamily:"monospace"}}>{entry.scores?.[obj.key]||0}%</div>
                      <div style={{fontSize:9,color:C.muted}}>{obj.icon} {obj.key}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {(entry.items||entry.foods||[]).slice(0,8).map((f,i)=>(
                    <span key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:99,background:C.border,color:C.muted}}>{typeof f==="object"?f.name:f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
