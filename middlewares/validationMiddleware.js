// middlewares/validationMiddleware.js
const Joi = require('joi');

const registrationSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required().messages({
        'string.base': `"username" phải là một chuỗi`,
        'string.empty': `"username" không được để trống`,
        'string.min': `"username" phải có ít nhất {#limit} ký tự`,
        'string.max': `"username" không được vượt quá {#limit} ký tự`,
        'string.alphanum': `"username" chỉ được chứa ký tự chữ và số`,
        'any.required': `"username" là trường bắt buộc`
    }),
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({ // tlds: { allow: false } để không kiểm tra top-level domain
        'string.base': `"email" phải là một chuỗi`,
        'string.empty': `"email" không được để trống`,
        'string.email': `"email" phải là một địa chỉ email hợp lệ`,
        'any.required': `"email" là trường bắt buộc`
    }),
    password: Joi.string().min(6).required().messages({
        'string.base': `"password" phải là một chuỗi`,
        'string.empty': `"password" không được để trống`,
        'string.min': `"password" phải có ít nhất {#limit} ký tự`,
        'any.required': `"password" là trường bắt buộc`
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': `"confirmPassword" phải trùng với "password"`,
        'string.empty': `"confirmPassword" không được để trống`,
        'any.required': `"confirmPassword" là trường bắt buộc`
    })
});

const loginSchema = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.base': `"email" phải là một chuỗi`,
        'string.empty': `"email" không được để trống`,
        'string.email': `"email" phải là một địa chỉ email hợp lệ`,
        'any.required': `"email" là trường bắt buộc`
    }),
    password: Joi.string().required().messages({
        'string.base': `"password" phải là một chuỗi`,
        'string.empty': `"password" không được để trống`,
        'any.required': `"password" là trường bắt buộc`
    })
});

// Middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false, errors: { wrap: { label: false } } }); // label: false để không có dấu "" quanh tên trường
        if (error) {
            const errors = error.details.map(detail => ({
                message: detail.message,
                field: detail.path.join('.') // path có thể là mảng nếu là nested object
            }));
            // Nếu là request AJAX thì trả về JSON, nếu không thì có thể dùng flash messages và redirect
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ errors });
            }
            // Đối với form submit truyền thống, bạn có thể muốn dùng req.flash và redirect
            // Ví dụ (cần cài connect-flash và session middleware):
            // req.flash('error_messages', errors.map(e => e.message));
            // req.flash('form_data', req.body);
            // return res.redirect('back');
            console.log("Validation errors:", errors);
            return res.status(400).render('auth/register', { // Hoặc login
                title: 'Đăng ký', // Hoặc Đăng nhập
                errors: errors,
                formData: req.body, // Gửi lại dữ liệu form để user không phải nhập lại
                user: req.user // req.user nếu có middleware xác thực trước đó
            });
        }
        next();
    };
};

module.exports = {
    validateRegistration: validate(registrationSchema),
    validateLogin: validate(loginSchema),
};