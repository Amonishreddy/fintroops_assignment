const express = require('express');
const app = express();
const ejsMate = require('ejs-mate');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override')
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const bcrypt = require('bcrypt');
const fs = require('fs');
const AppError = require('./AppError');
const requireLogin = (req, res, next) => {
    if (!req.session.Admin_id) {
        return res.redirect('/login')
    }
    next();
}
const uri = 'mongodb://localhost:27017/idcarddata';
const connectionParams={
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true 
}


mongoose.connect(uri,connectionParams)
    .then( () => {
        console.log('Connected to database ')
    })
    .catch( (err) => {
        console.error(`Error connecting to the database. \n${err}`);
    })

const studentdata = require('./models/studentschema');
const Admin = require('./models/user');

        // mongoose.connect('mongodb://localhost:27017/idcarddata', { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
        // .then(() => {
        //     console.log("MONGO CONNECTION OPEN!!!")
        // })
        // .catch(err => {
        //     console.log("OH NO MONGO CONNECTION ERROR!!!!")
        //     console.log(err)
        // })

        

app.engine('ejs',ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

function wrapAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(e => next(e))
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
 
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype == "image/png" ) {
        cb(null, true);
      } else {
        cb(null, false);
        return cb(new AppError('Only .png format allowed!')); 
      }
    }
  });



const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 *7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig))
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})



app.get('/', (req,res)=>{
    res.redirect('info/new')

})
app.get('/login', (req, res) => {
    res.render('login')
})
app.post('/login', wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const user = await Admin.findOne({username:username});
    if (!user) {
        req.flash('error','username or password incorrect');
        // throw new AppError('username or password incorrect',404);
        res.redirect('/login')
       
    }
    else{
        const validpassword = await bcrypt.compare(password,user.password)
    if (validpassword) {
        req.session.Admin_id = user._id;
        res.redirect('/Admin/info');
    }
    else {
        req.flash('error','username or password incorrect');
        res.redirect('/login')
    }

    }
    
}));
app.post('/logout', (req, res) => {
    req.session.Admin_id = null;
    // req.session.destroy();
    res.redirect('/login');
})
// app.get('/register', (req, res) => {
//     res.render('register')
// })

// app.post('/register', async (req, res) => {
//     const { password, username } = req.body;
//     const user = new Admin({ username, password })
//     await user.save();
//     req.session.Admin_id = Admin._id;
//     res.redirect('/')
// })
app.get('/Admin/info',requireLogin,wrapAsync(async (req, res) => {
    const studentdatas = await studentdata.find({})
    res.render('index', { studentdatas})
}))

app.get('/info/new', (req, res) => {
    res.render('new')
})

app.post('/info', upload.single('image'), wrapAsync(async(req, res, next) => {
 
    var obj = {
        name: req.body.name,
        address: req.body.address,
        contact : req.body.number,
        studentid : req.body.studentid,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    }
    const studentdatas = new studentdata(obj);

    await studentdatas.save();
    req.flash('success', 'Successfully added new student data');
    res.redirect('/info/new');

}))


app.get('/Admin/info/:id/edit',requireLogin,wrapAsync( async (req, res,next) => {
    const { id } = req.params;
    const studentdatas = await studentdata.findById(id);
    if (!studentdatas) {
        throw new AppError('info Not Found', 404);
    }
    res.render('edit', { studentdatas})
}))


app.put('/Admin/info/:id',upload.single('image'),requireLogin,wrapAsync( async (req, res,next) => {
    const { id } = req.params;
   const cont = await studentdata.findById(id).exec();
    var obj = {
        name: req.body.name,
        address: req.body.address,
        contact : req.body.number,
        studentid: req.body.studentid,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        },
    }
    if (!req.body.img ) {
        cont.img = obj.img;
    }
    const studentdatas = await studentdata.findByIdAndUpdate(id, obj, { runValidators: true, new: true });
    // req.flash('success', 'Successfully updated student data');
    res.redirect('/Admin/info');
}))

app.delete('/Admin/info/:id',requireLogin,wrapAsync(async (req, res,next) => {
    const { id }  = req.params;
    const deleteddata = await studentdata.findByIdAndDelete(id);
    // req.flash('success', 'Successfully deleted student data');
    res.redirect('/Admin/info');
}))


app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    
    res.status(statusCode).render('error', { err })
})



module.exports = app.listen(3000, () => {
    console.log("APP IS LISTENING ON PORT 3000!")
})


