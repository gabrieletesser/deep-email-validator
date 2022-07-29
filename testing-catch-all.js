const { validate } = require('./dist/index');

(async()=>{
    console.log(validate)
    console.log(await validate({email: 'gabriele@thecometnetwork.cz', validateCatchAll: true}))
})()