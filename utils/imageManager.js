const { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Cache = require( "node-cache" );

const client = new S3Client({
    region: 'EU1',
    endpoint: 'https://gateway.storjshare.io',
    credentials: { secretAccessKey: process.env.S3_SECRET_KEY, accessKeyId: process.env.S3_ACCESS_KEY }
});

const cache = new Cache({ stdTTL: process.env.S3_SIGNED_URL_EXPIRE - 100 || 3600 })


/**
 * @desc    Remove image from storage
 * @param  fileName {String} Specifies the name of the file to be removed
 */
exports.deleteImage = async (fileName) => {
    const input = {
        Bucket: 'whynot-uploads',
        Key: fileName,
    }

    const command = new DeleteObjectCommand(input);
    const response = await client.send(command);

    return response;
}

/**
 * @desc    Add image to storage
 * @param  file {File} File that will be stored
 */
exports.uploadImage = async (file) => {
    const input = {
        Bucket: 'whynot-uploads',
        Key: file.name,
        ACL: 'public-read',
        Body: file.data,
        ContentType: file.mimeType,
    }

    const command = new PutObjectCommand(input);
    return await client.send(command);
}

/**
 * @desc    Get signed public image url
 * @param  fileName {String} Specifies the name of the file the url will be generated for
 */
exports.getImageUrl = async (fileName) => {
    const input = {
        Bucket: 'whynot-uploads',
        Key: fileName,
    };

    const command = new GetObjectCommand(input);
    const url = await getSignedUrl(client, command, { expiresIn: process.env.S3_SIGNED_URL_EXPIRE || 3600 });
    return url;
}

/**
 * @desc    Get signed public images url
 * @param  fileNames {Array<String>} Get signed urls for filenames
 * @param  id {String} Product id, used for caching purposes
 */
exports.getImageArraySrc = async (fileNames, id) => {
    if (!Array.isArray(fileNames) || !fileNames.length) {
        return [];
    }

    if(id && cache.get(id)) {
        return cache.get(id);
    }

    const promises = fileNames.map((fileName) => {
        const input = {
            Bucket: 'whynot-uploads',
            Key: fileName,
        };

        const command = new GetObjectCommand(input);
        return getSignedUrl(client, command, { expiresIn: process.env.S3_SIGNED_URL_EXPIRE || 3600 });
    })
    const res = await Promise.all(promises);

    // store in cache
    if (id) cache.set(id, res);

    return res;
}