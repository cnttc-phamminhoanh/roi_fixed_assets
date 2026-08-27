// backend/src/middlewares/roifixed.validation.js

/**
 * Validate cập nhật benefit
 */
const validateUpdateBenefit = (req, res, next) => {
    const { planNo, planId, benefitValue } = req.body;
    
    if (!planNo || !planId) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu thông tin planNo hoặc planId'
        });
    }

    if (benefitValue === undefined || benefitValue === null) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập giá trị benefit'
        });
    }

    if (isNaN(benefitValue) || benefitValue < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giá trị benefit phải là số và lớn hơn hoặc bằng 0'
        });
    }

    next();
};

module.exports = {
    validateUpdateBenefit
};