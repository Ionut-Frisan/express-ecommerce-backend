const { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new S3Client({
    region: 'EU1',
    endpoint: 'https://gateway.storjshare.io',
    credentials: { secretAccessKey: 'j35nwulpwojbmlt73weokn3g3qqrofsuddcbyyyzkp2auugwalcp6', accessKeyId: 'juarff3ypbgxgkf3rk6ojlhloimq' }
});
//
// (async function test() {
//     // await client.config.update({region: 'EU1'});
//     try{
//
//     const res= await client.config.region('EU1');
//     console.log(res);
//     } catch (e) {
//         console.log(e);
//     }
// }())

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
    const url = await getSignedUrl(client, command, { expiresIn: 36000 });
    return url;
}

exports.getImageArraySrc = async (fileNames) => {
    if (!Array.isArray(fileNames) || !fileNames.length) {
        return [];
    }
    const promises = fileNames.map((fileName) => {
        const input = {
            Bucket: 'whynot-uploads',
            Key: fileName,
        };

        const command = new GetObjectCommand(input);
        return getSignedUrl(client, command, { expiresIn: 36000 });
    })
    const res = await Promise.all(promises)

    return res;
}