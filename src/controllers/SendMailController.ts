import { Request, Response} from 'express';
import { AlreadyHasActiveConnectionError, getCustomRepository } from 'typeorm';
import { SurveyRepository } from '../repositories/SurveyRepository';
import { SurveysUsersRepository } from '../repositories/SurveysUsersRepository';
import { UserRepository } from '../repositories/UserRepository';
import { resolve } from "path"
import SendMailService from '../services/SendMailService';
import { AppError } from '../errors/AppError';

class SendMailController {

    async execute(request: Request, response: Response) {
        const { email, survey_id} = request.body;

        const userRepository = getCustomRepository(UserRepository);
        const surveysRepository = getCustomRepository(SurveyRepository);
        const surveyUsersRepository = getCustomRepository(SurveysUsersRepository);

        const user = await userRepository.findOne({email});

        if(!user) {
            throw new AppError("User does not exists");
        }

        const survey = await surveysRepository.findOne({id: survey_id});

        if(!survey) {
            throw new AppError("Survey does not exists");
        }

        const name = user.name;
        const title = survey.title;
        const description = survey.description;

        const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs");

        // Salvar as informações na tabela surveyUser
        const surveyUserAlreadExists = await surveyUsersRepository.findOne({
            where: {user_id: user.id, value: null},
            relations: ["user", "survey"]
        })

        const variables = {
            name: name,
            title: title,
            description: description,
            id: "",
            link: process.env.URL_MAIL
        }
        
        if(surveyUserAlreadExists) {
            variables.id = surveyUserAlreadExists.id;
            await SendMailService.execute(email, title, variables, npsPath)
            return response.json(surveyUserAlreadExists);
        }

        const surveyUser = surveyUsersRepository.create({
            user_id: user.id,
            survey_id
        })
        await surveyUsersRepository.save(surveyUser);
        variables.id = surveyUser.id;

        // Enviar email para o usuário
        
    }
}

export { SendMailController }
