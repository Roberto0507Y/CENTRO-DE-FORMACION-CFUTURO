"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const downloadResponse_1 = require("../../common/utils/downloadResponse");
const file_service_1 = require("./file.service");
class FileController {
    constructor() {
        this.service = new file_service_1.FileService();
        this.download = async (req, res) => {
            const id = Number(req.params.id);
            const file = await this.service.createDownloadStream(req.auth, id);
            (0, downloadResponse_1.sendDownloadStream)(res, file);
        };
    }
}
exports.FileController = FileController;
