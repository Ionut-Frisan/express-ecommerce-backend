const { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Cache = require( "node-cache" );

const client = new S3Client({
    region: 'EU1',
    endpoint: 'https://gateway.storjshare.io',
    credentials: { secretAccessKey: 'j35nwulpwojbmlt73weokn3g3qqrofsuddcbyyyzkp2auugwalcp6', accessKeyId: 'juarff3ypbgxgkf3rk6ojlhloimq' }
});

const cache = new Cache({ stdTTL: process.env.S3_SIGNED_URL_EXPIRE - 100 || 3600 })

exports.deleteImage = async (fileName) => {
    const input = {
        Bucket: 'whynot-uploads',
        Key: fileName,
    }

    const command = new DeleteObjectCommand(input);
    const response = await client.send(command);

    return response;
}

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

exports.getImageUrl = async (fileName) => {
    const input = {
        Bucket: 'whynot-uploads',
        Key: fileName,
    };

    const command = new GetObjectCommand(input);
    const url = await getSignedUrl(client, command, { expiresIn: process.env.S3_SIGNED_URL_EXPIRE || 3600 });
    return url;
}

let totalCount = 0;

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
        totalCount++;

        const command = new GetObjectCommand(input);
        return getSignedUrl(client, command, { expiresIn: process.env.S3_SIGNED_URL_EXPIRE || 3600 });
    })
    const res = await Promise.all(promises);

    // store in cache
    if (id) cache.set(id, res);
    console.log(totalCount);
    return res;
}