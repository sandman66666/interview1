import { useEffect, useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import { Textarea } from "../ui/textarea"
import { PlusCircle, Trash2 } from "lucide-react"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

interface Question {
  text: string
  voice_id: string
  voice_style: string
  order_number: number
}

interface QuestionFormProps {
  onQuestionsChange: (questions: Question[]) => void
}

const defaultQuestions: Question[] = [
  { text: "Please introduce yourself and tell us about your background.", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 0 },
  { text: "What interests you about this position?", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 1 },
  { text: "Can you describe a challenging project you've worked on?", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 2 },
  { text: "How do you handle difficult situations or conflicts at work?", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 3 },
  { text: "What are your strengths and areas for improvement?", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 4 },
  { text: "Where do you see yourself in 5 years?", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 5 },
  { text: "What's your approach to problem-solving?", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 6 },
  { text: "How do you stay updated with industry trends?", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 7 },
  { text: "Describe a time when you demonstrated leadership.", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 8 },
  { text: "Do you have any questions for us?", voice_id: "en-US-JennyNeural", voice_style: "Cheerful", order_number: 9 }
]

const voiceStyles = [
  "Cheerful",
  "Professional",
  "Friendly",
  "Calm",
  "Enthusiastic"
]

export function QuestionForm({ onQuestionsChange }: QuestionFormProps) {
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions)

  // Update parent component with initial questions
  useEffect(() => {
    onQuestionsChange(questions)
  }, [])

  const handleAddQuestion = () => {
    const newQuestions = [
      ...questions,
      {
        text: "",
        voice_id: "en-US-JennyNeural",
        voice_style: "Cheerful",
        order_number: questions.length
      }
    ]
    setQuestions(newQuestions)
    onQuestionsChange(newQuestions)
  }

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index)
    // Update order numbers
    const updatedQuestions = newQuestions.map((q, i) => ({
      ...q,
      order_number: i
    }))
    setQuestions(updatedQuestions)
    onQuestionsChange(updatedQuestions)
  }

  const handleQuestionChange = (index: number, text: string) => {
    const newQuestions = [...questions]
    newQuestions[index] = {
      ...newQuestions[index],
      text
    }
    setQuestions(newQuestions)
    onQuestionsChange(newQuestions)
  }

  const handleVoiceStyleChange = (index: number, style: string) => {
    const newQuestions = [...questions]
    newQuestions[index] = {
      ...newQuestions[index],
      voice_style: style
    }
    setQuestions(newQuestions)
    onQuestionsChange(newQuestions)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Interview Questions</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor={`question-${index}`} className="text-sm font-medium mb-2 block">
                      Question {index + 1}
                    </Label>
                    <Textarea
                      id={`question-${index}`}
                      value={question.text}
                      onChange={(e) => handleQuestionChange(index, e.target.value)}
                      placeholder="Enter your question here..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`voice-style-${index}`} className="text-sm font-medium mb-2 block">
                      Voice Style
                    </Label>
                    <Select
                      value={question.voice_style}
                      onValueChange={(value) => handleVoiceStyleChange(index, value)}
                    >
                      <SelectTrigger id={`voice-style-${index}`}>
                        <SelectValue placeholder="Select a voice style" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceStyles.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemoveQuestion(index)}
                  className="mt-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddQuestion}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Question
          </Button>
          <Button type="submit">Create Interview</Button>
        </div>
      </CardContent>
    </Card>
  )
}