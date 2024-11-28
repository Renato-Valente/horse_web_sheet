const readXlsxFile = require('read-excel-file/node');
const XLSX = require('xlsx');
const fs = require('fs');
const PATH = require('path');



const format_row = (row, info) => {
    
    const result = {};
    result.id = null;
    result.competicao = info.competicao ? info.competicao : 'Não informado';
    result.category = row['CAT.'] ? row['CAT.'] : 'Não informado';
    result.ano_prova = info.data ? info.data.slice(-4) : 'Não informado';

    result.dados_prova = {
        categoria: info.sheet ? info.sheet : 'Não informado',
        altura_salto: info.altura_salto ? info.altura_salto : 'Não informado',
        tipo_percurso: info.tipo_percurso ? info.tipo_percurso : 'Não informado',
        hora: info.hora ? info.hora : 'Não informado',
        data: info.data ? info.data : 'Não informado',
    }

    result.classification = row.CL ? row.CL : 'Não informado';

    result.competitorInfo = {
        competitor: row.CONCORRENTE ? row.CONCORRENTE : 'Não informado',
        entity: row['ENT.'] ? row['ENT.'] : 'Não informado',
        country: null
    }

    result.cavalo = {
        name: row.CAVALO,
        birth_date: null,
        sex: null,
        race: null,
        owner: row.CONCORRENTE ? row.CONCORRENTE : 'Não informado'
    }

//    result.fouls = row.PTS ? row.PTS : 'Não informado';
    if(row.PTS == undefined || row.PTS == null) {
        result.fouls = 'Não informado'
    }
    else{ result.fouls = row.PTS }

    if(result.fouls == 'FF') result.fouls = 'Forfait';
    if(result.fouls == 'EL') result.fouls = 'Eliminado';

    result.time = row.TEMPO ? row.TEMPO : 'Não informado';
    result.federation = 'TODO';

    

    return result;
}

const printData = (args) => {
    const { data, fullPath, sheet } = args;
    const path = args.path;
    //console.log('data lengh', data.length);
    //console.log('SHEET: ', sheet);
    console.log('arquivo: ', fullPath);
    const basename = PATH.basename(fullPath);
    //console.log('nome do arquivo: ', PATH.basename(fullPath));
    console.log('path: ', path);
    console.log('//////////////////////////////////////////////////////////////////////\n');

    const firstIndex = data.findIndex((item) => {
        return (
            item.includes('CAT.') ||
            item.includes('ENT.') ||
            item.includes('APROX.')
        )
    })

    console.log('first index: ', firstIndex);
    //const fields = data.slice(firstIndex, firstIndex + 1)[0];
    const fields = data[firstIndex];
    console.log('fields', fields);

    const lastIndex = data.findIndex((item) => {
        if (!item[0]) return false;
        return item[0].toString().includes('Desenvolvido por');
    })
    console.log('lastIndex', lastIndex);
    //'moreResults' deve armazenar copias dos objetos de 'results'
    //com os valores das colunas repetidas
    const moreResults = [];


    //info deve guardar informacoes adicionais (competicao, ano_prova, categoria, etc)
        //para serem passadas na funcao format_row
        const info = {};
        info.sheet = sheet;

        //capturando o valor de competição ex: CONCURSO DE SALTO ESTADUAL....
        const competicao_line = data.find((item) => {
            if (!item) return false;
            let hasText = false;
            item.forEach((i) => {
                if(i) {hasText = true};
            })
            return hasText;
        })
        console.log('valor de competicao: ', competicao_line);

        info.competicao = competicao_line.find((item) => {
            return item;
        }).toString();

        //capturando o valor de hora ex: 9h30min
         const hora = data.find((line) => {
            const text = line.toString();
            if(!text) return false;
            return /\d{1,2}h\d{2}min/.test(text);
            //return text.match(/(\d{1,2}h\d{2}min)/g)
        });

        info.hora = hora ? hora.toString().match(/(\d{1,2}h\d{2}min)/g) : null;

        //capturando o valor de altura_salto ex: 1,10m
        const altura = data.find((line) => {
            const text = line.toString();
            if(!text) return false;
            return /\d{1},\d{2}m/.test(text)
        })
        info.altura_salto = altura ? altura.toString().match(/(\d{1},\d{2}m)/g)[0] : null;

        //capturando o valor da data dd/mm/aaaa
        const index = data.findIndex((line) => {
            if(!line.toString()) return false;
            const date = line.toString().match(/(\d{2}\/\d{2}\/\d{4})/);
            if(date) return true;
        })
        info.data = index >= 0 ? data[index].toString().match(/(\d{2}\/\d{2}\/\d{4})/)[0] : null; 


    const result = data.slice(firstIndex + 1, lastIndex).map((item) => {


        const row = {};
        //buffer guarda o nome dos campos jah atribuidos
        //para ajudar a evitar campos repetidos
        const buffer = [];
        //'repeatedValues' deve armazenar no nome das colunas
        //repetidas e seus valores para serem atribuidos mais tarde
        //no objeto 'secondRow'
        const repeatedValues = [];
        fields.forEach((i, index) => {
            if(!buffer.includes(i)){
                //coluna inedita
                buffer.push(i);
                row[i] = item[index]
            }
            else{
                //coluna repetida
                repeatedValues.push({column: i, value: item[index]});
            }
        })
        if (!repeatedValues.length > 0) return format_row(row, info); //tabela sem colunas repetidas

        //aqui nos criamos um clone de row e trocamos o valor
        //das colunas repetidas
        const secondRow = structuredClone(row); //structuredClone retorna um clone do objeto recebido
        repeatedValues.forEach((item) => {
            secondRow[item.column] = item.value;
        })
        moreResults.push(secondRow);
        return format_row(row, info);
    })
    //um array com todas as colunas possiveis da tabela
    const possibleFields = [
        'ORD',         'CAVALO',
        'CONCORRENTE', 'ENT.',
        'CAT.',        'EQUIPE',
        'PTS',         'TEMPO',
        'APROX.',      'CL'
      ]
    //Aqui nos criamos o array 'missingFields' que deve guardar todas as possiveis colunas que a tabela não possui

    //Nos iteramos o array 'possibleFields' e, para cada item, vemos se o array 'fields'
    //possui um item com o mesmo nome. Caso não possua, o item é adicionado no array 'missingFields'
    const missingFields = [];
    possibleFields.forEach((item) => {
        const index = fields.findIndex((i) => i == item);
        if (index < 0) missingFields.push(item);
    })

    console.log('missing fields', missingFields);
    //Aqui nos adicionamos os itens de 'missingFields' como chaves para cada objeto
    //de 'result' e atribuimos o valor undefined pra ela
    missingFields.forEach((item) => {
        result.forEach((i) => {
            i[item] = undefined
        })
    })
    //console.log('data', data);
    //console.log(result);
    
    const finalResult = [...result, ...moreResults];

    const dir =`./results/${basename.slice(0,-5)}`;
    const filePath = dir + `/${sheet}.json`;

    fs.mkdir(dir, {recursive: true}, (err) => {
        if(err){
            console.log(`erro ao tentar criar diretorio ${dir}`, err);
        } else{
            fs.writeFile(filePath, JSON.stringify(finalResult,null,2), (err) => {
                if(err){
                    console.log(`Erro ao criar arquivo ${filePath}`);
                }
            })
        }
    })

    //console.log('finalResult: ', finalResult);
}

const listFiles = (path) => {
    fs.readdir(path, (err, files) => {
        if(err){
            console.err('erro ao tentar ler arquivos', err);
        }
        else{
            files.forEach((file) => {
                const fullPath = path + '/' + file;

                fs.stat(fullPath, (err, stats) => {
                    if(err){
                        console.log('deu tudo errado :(', err);
                    }
                    else{
                        if(stats.isDirectory()){
                            listFiles(fullPath);
                        }
                        else{
                            const basename = PATH.basename(fullPath);
                            if(!/.xlsx$/.test(basename)) return;
                            const sheets = XLSX.readFile(fullPath).SheetNames.filter((item) => /^P\d+$/.test(item));
                            console.log('Planilhas do arquivo: ', fullPath);
                            console.log('valor de path: ', path);
                            console.log(sheets);
                            
                            sheets.forEach((sheet) => {
                                readXlsxFile(fullPath, {sheet}).then((data) => {
                                    printData({data, fullPath, sheet, path});
                                })
                            })

                        }
                    }
                })
            })
        }
    })
}

listFiles('./data');
