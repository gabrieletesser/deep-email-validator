const { validate } = require('./dist/index');

(async()=>{
    console.log(validate)
    console.log(await validate({email: 'test@barclays.com', validateCatchAll: true}))
})()