import { Router } from 'express';
const router= Router();


import {faker}  from "@faker-js/faker";
faker.locale='es'


router.get ('/api/productos-test', (req,res)=>{
    
    const response = [];

    for (let i = 0; i < 5; i++) {
      response.push({
        title: faker.commerce.product(),
        price: faker.commerce.price(),
        thumbnail: faker.image.imageUrl(),
      });
    }
    // console.log(response)
    res.json(response);
})


export default router;