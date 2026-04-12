"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schemas) {
    return (req, _res, next) => {
        if (schemas.body)
            req.body = schemas.body.parse(req.body);
        if (schemas.params) {
            const parsed = schemas.params.parse(req.params);
            Object.assign(req.params, parsed);
        }
        if (schemas.query) {
            const parsed = schemas.query.parse(req.query);
            Object.assign(req.query, parsed);
        }
        next();
    };
}
